import _webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import CSSSplitWebpackPlugin from '../../src';
import path from 'path';
import MemoryFileSystem from 'memory-fs';
import {expect} from 'chai';

const config = (options) => {
  return {
    entry: './index.js',
    context: path.join(__dirname, '..', '..', 'example'),
    output: {
      path: path.join(__dirname, 'dist'),
      publicPath: '/foo',
      filename: 'bundle.js',
    },
    module: {
      loaders: [{
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader'),
      }],
    },
    plugins: [
      new ExtractTextPlugin('styles.css'),
      new CSSSplitWebpackPlugin(options),
    ],
  };
};

const webpack = (options) => {
  const compiler = _webpack(config(options));
  compiler.fs = new MemoryFileSystem();
  return new Promise((resolve) => {
    compiler.run((err, stats) => {
      expect(err).to.be.null;
      resolve(stats.toJson());
    });
  });
};

describe('CSSSplitWebpackPlugin', () => {
  it('should split files when needed', () => {
    return webpack({size: 3, imports: true}).then((stats) => {
      expect(stats).to.not.be.null;
      expect(stats.assetsByChunkName).to.have.property('main')
        .to.contain('styles-2.css');
    });
  });
  it('should ignore files that do not need splitting', () => {
    return webpack({size: 10, imports: true}).then((stats) => {
      expect(stats).to.not.be.null;
      expect(stats.assetsByChunkName).to.have.property('main')
        .to.not.contain('styles-2.css');
    });
  });
  it('should generate an import file when requested', () => {
    return webpack({size: 3, imports: true}).then((stats) => {
      expect(stats).to.not.be.null;
      expect(stats.assetsByChunkName).to.have.property('main')
        .to.contain('styles.css');
    });
  });
  it('should remove the original asset when splitting', () => {
    return webpack({size: 3, imports: false}).then((stats) => {
      expect(stats).to.not.be.null;
      expect(stats.assetsByChunkName).to.have.property('main')
        .to.not.contain('styles.css');
    });
  });
});
