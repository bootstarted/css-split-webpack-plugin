const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CSSSplitWebpackPlugin = require('../../').default;

module.exports = {
  entry: './index.js',
  context: __dirname,
  output: {
    path: __dirname + '/dist',
    publicPath: '/foo',
    filename: 'bundle.js',
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
      ],
    }],
  },
  devtool: 'source-map',
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new CSSSplitWebpackPlugin({size: 3, imports: true}),
  ],
};
