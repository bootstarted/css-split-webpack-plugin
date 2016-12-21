var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CSSSplitWebpackPlugin = require('../../').default;

module.exports = {
  entry: './index.js',
  context: __dirname,
  output: {
    path: __dirname + '/dist',
    publicPath: '/foo',
    filename: 'bundle.js',
  },
  module: {
    loaders: [{
      test: /\.css$/,
      loader: ExtractTextPlugin.extract.length !== 1 ?
        ExtractTextPlugin.extract('style-loader', 'css-loader') :
        ExtractTextPlugin.extract({
          fallbackLoader: 'style-loader',
          loader: 'css-loader',
        }),
    }],
  },
  devtool: 'source-map',
  plugins: [
    new ExtractTextPlugin("styles.css"),
    new CSSSplitWebpackPlugin({size: 3, imports: true}),
  ],
};
