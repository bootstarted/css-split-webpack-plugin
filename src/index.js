import postcss from 'postcss';
import chunk from './chunk';
import SourceMapSource from 'webpack/lib/SourceMapSource';
import RawSource from 'webpack/lib/RawSource';

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
 * Webpack plugin to split CSS assets into multiple files. This is primarily
 * used for dealing with IE <= 9 which cannot handle more than ~4000 rules
 * in a single stylesheet.
 */
export default class CSSSplitWebpackPlugin {
  /**
   * Create new instance of CSSSplitWebpackPlugin.
   * @param {Number} size Maximum number of rules for a single file.
   * @param {Boolean} imports True to generate an additional import asset.
   */
  constructor({size = 4000, imports = false}) {
    this.options = {size, imports};
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
    // Function for generating a new name for the split files.
    // TODO: Make this configurable.
    const name = (i) =>
      key.replace(/(.*)\.css(\..+)?$/, `$1-${i + 1}.css$2`);
    return postcss([chunk({
      ...this.options,
      result: (i) => {
        return {
          to: name(i),
          from: key,
          map: {
            inline: false,
            prev: input.map,
          },
        };
      },
    })]).process(input.source, {
      from: key,
    }).then((result) => {
      return Promise.resolve({
        file: key,
        chunks: result.chunks.map(({css, map}, i) => {
          return new SourceMapSource(
            css,
            name(i),
            map.toString()
          );
        }),
      });
    });
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
    // Only run on `this-compilation` to avoid injecting the plugin into
    // sub-compilers as happens when using the `extract-text-webpack-plugin`.
    compiler.plugin('this-compilation', (compilation) => {
      const assets = compilation.assets;
      const publicPath = strip(compilation.options.output.publicPath || './');
      compilation.plugin('optimize-chunk-assets', (chunks, done) => {
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
                assets[file._name] = file;
                chunk.files.push(file._name);
              });
              // Remove or rewrite the existing file.
              if (this.options.imports) {
                assets[entry.file] = new RawSource(entry.chunks.map((file) => {
                  return `@import "${publicPath}/${file._name}";`;
                }).join('\n'));
              } else {
                chunk.files.splice(chunk.files.indexOf(entry.file), 1);
                delete assets[entry.file];
              }
            });
            return Promise.resolve();
          });
        });
        Promise.all(promises).then(() => {
          done();
        }, done);
      });
    });
  }
}
