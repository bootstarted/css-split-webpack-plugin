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
      test: /\.less$/,
      loader: ExtractTextPlugin.extract(
        'css?-url&-autoprefixer&sourceMap!less?sourceMap'
      ),
    }],
  },
  devtool: 'source-map',
  plugins: [
    new ExtractTextPlugin("styles.css"),
    new CSSSplitWebpackPlugin({size: 3}),
  ],
};
