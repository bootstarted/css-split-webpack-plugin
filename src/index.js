import postcss from 'postcss';
import chunk from './chunk';
import {SourceMapSource, RawSource} from 'webpack-sources';
import {interpolateName} from 'loader-utils';

/**
 * Detect if a file should be considered for CSS splitting.
 * @param {String} name Name of the file.
 * @returns {Boolean} True if to consider the file, false otherwise.
 */
const isCSS = (name : string) : boolean => /\.css$/.test(name);

/**
 * Remove the trailing `/` from URLs.
 * @param {String} str The url to strip the trailing slash from.
 * @returns {String} The stripped url.
 */
const strip = (str : string) : string => str.replace(/\/$/, '');

/**
 * Create a function that generates names based on some input. This uses
 * webpack's name interpolator under the hood, but since webpack's argument
 * list is all funny this exists just to simplify things.
 * @param {String} input Name to be interpolated.
 * @returns {Function} Function to do the interpolating.
 */
const nameInterpolator = (input) => ({file, content, index}) => {
  const res = interpolateName({
    context: '/',
    resourcePath: `/${file}`,
  }, input, {
    content,
  }).replace(/\[part\]/g, index + 1);
  return res;
};

/**
 * Normalize the `imports` argument to a function.
 * @param {Boolean|String} input The name of the imports file, or a boolean
 * to use the default name.
 * @param {Boolean} preserve True if the default name should not clash.
 * @returns {Function} Name interpolator.
 */
const normalizeImports = (input, preserve) => {
  switch (typeof input) {
  case 'string':
    return nameInterpolator(input);
  case 'boolean':
    if (input) {
      if (preserve) {
        return nameInterpolator('[name]-split.[ext]');
      }
      return ({file}) => file;
    }
    return () => false;
  default:
    throw new TypeError();
  }
};

/**
 * Webpack plugin to split CSS assets into multiple files. This is primarily
 * used for dealing with IE <= 9 which cannot handle more than ~4000 rules
 * in a single stylesheet.
 */
export default class CSSSplitWebpackPlugin {
  /**
   * Create new instance of CSSSplitWebpackPlugin.
   * @param {Number} size Maximum number of rules for a single file.
   * @param {Boolean|String} imports Truish to generate an additional import
   * asset. When a boolean use the default name for the asset.
   * @param {String} filename Control the generated split file name.
   * @param {Boolean} defer Defer splitting until the `emit` phase. Normally
   * only needed if something else in your pipeline is mangling things at
   * the emit phase too.
   * @param {Boolean} preserve True to keep the original unsplit file.
   */
  constructor({
    size = 4000,
    imports = false,
    filename = '[name]-[part].[ext]',
    preserve,
    defer = false,
  }) {
    this.options = {
      size,
      imports: normalizeImports(imports, preserve),
      filename: nameInterpolator(filename),
      preserve,
      defer,
    };
  }

  /**
   * Generate the split chunks for a given CSS file.
   * @param {String} key Name of the file.
   * @param {Object} asset Valid webpack Source object.
   * @returns {Promise} Promise generating array of new files.
   */
  file(key : string, asset : Object) {
    // Use source-maps when possible.
    const input = asset.sourceAndMap ? asset.sourceAndMap() : {
      source: asset.source(),
    };
    const getName = (i) => this.options.filename({
      ...asset,
      content: input.source,
      file: key,
      index: i,
    });
    return postcss([chunk(this.options)]).process(input.source, {
      map: {
        prev: input.map,
      },
    }).then((result) => {
      return Promise.resolve({
        file: key,
        chunks: result.chunks.map(({css, map}, i) => {
          const name = getName(i);
          const result = map ? new SourceMapSource(
            css,
            name,
            map.toString()
          ) : new RawSource(css);
          result.name = name;
          return result;
        }),
      });
    });
  }

  chunksMapping(compilation, chunks, done) {
    const assets = compilation.assets;
    const publicPath = strip(compilation.options.output.publicPath || './');
    const promises = chunks.map((chunk) => {
      const input = chunk.files.filter(isCSS);
      const items = input.map((name) => this.file(name, assets[name]));
      return Promise.all(items).then((entries) => {
        entries.forEach((entry) => {
          // Skip the splitting operation for files that result in no
          // split occuring.
          if (entry.chunks.length === 1) {
            return;
          }
          // Inject the new files into the chunk.
          entry.chunks.forEach((file) => {
            assets[file.name] = file;
            chunk.files.push(file.name);
          });
          const content = entry.chunks.map((file) => {
            return `@import "${publicPath}/${file._name}";`;
          }).join('\n');
          const imports = this.options.imports({
            ...entry,
            content,
          });
          if (!this.options.preserve) {
            chunk.files.splice(chunk.files.indexOf(entry.file), 1);
            delete assets[entry.file];
          }
          if (imports) {
            assets[imports] = new RawSource(content);
            chunk.files.push(imports);
          }
        });
        return Promise.resolve();
      });
    });
    Promise.all(promises).then(() => {
      done();
    }, done);
  }

  /**
   * Run the plugin against a webpack compiler instance. Roughly it walks all
   * the chunks searching for CSS files and when it finds one that needs to be
   * split it does so and replaces the original file in the chunk with the split
   * ones. If the `imports` option is specified the original file is replaced
   * with an empty CSS file importing the split files, otherwise the original
   * file is removed entirely.
   * @param {Object} compiler Compiler instance
   * @returns {void}
   */
  apply(compiler : Object) {
    if (this.options.defer) {
      // Run on `emit` when user specifies the compiler phase
      // Due to the incorrect css split + optimization behavior
      // Expected: css split should happen after optimization
      compiler.plugin('emit', (compilation, done) => {
        return this.chunksMapping(compilation, compilation.chunks, done);
      });
    } else {
      // Only run on `this-compilation` to avoid injecting the plugin into
      // sub-compilers as happens when using the `extract-text-webpack-plugin`.
      compiler.plugin('this-compilation', (compilation) => {
        compilation.plugin('optimize-chunk-assets', (chunks, done) => {
          return this.chunksMapping(compilation, chunks, done);
        });
      });
    }
  }
}
