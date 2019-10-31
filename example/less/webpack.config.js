const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CSSSplitWebpackPlugin = require('../../').default;

const miniCssConfig = {
  loader: MiniCssExtractPlugin.loader,
  options: {
    // you can specify a publicPath here
    // by default it uses publicPath in webpackOptions.output
    publicPath: '../',
    hmr: process.env.NODE_ENV === 'development',
  },
};

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
      test: /\.less$/,
      use: [
        miniCssConfig,
        'css-loader',
        'less-loader',
      ],
    }],
  },
  devtool: 'source-map',
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new CSSSplitWebpackPlugin({size: 3}),
  ],
};
