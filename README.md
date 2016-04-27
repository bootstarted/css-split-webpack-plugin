# css-split-webpack-plugin

Split your CSS for stupid browsers using [webpack] and [postcss].

![build status](http://img.shields.io/travis/metalabdesign/css-split-webpack-plugin/master.svg?style=flat)
![coverage](http://img.shields.io/coveralls/metalabdesign/css-split-webpack-plugin/master.svg?style=flat)
![license](http://img.shields.io/npm/l/css-split-webpack-plugin.svg?style=flat)
![version](http://img.shields.io/npm/v/css-split-webpack-plugin.svg?style=flat)
![downloads](http://img.shields.io/npm/dm/css-split-webpack-plugin.svg?style=flat)

Using [webpack] to generate your CSS is fun for some definitions of fun. Unfortunately the fun stops when you have a large app and need IE9 support because IE9 will ignore any more than ~4000 selectors in your lovely generated CSS bundle. The solution is to split your CSS bundle smartly into multiple smaller CSS files. Now _you can_.™ Supports source-maps.

## Installation

```sh
npm install --save css-split-webpack-plugin
```

## Usage

Simply add an instance of `CSSSplitWebpackPlugin` to your list of plugins in your webpack configuration file _after_ `ExtractTextPlugin`. That's it!

```javascript
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CSSSplitWebpackPlugin = require('../').default;

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
      loader: ExtractTextPlugin.extract('style-loader', 'css-loader'),
    }],
  },
  plugins: [
    new ExtractTextPlugin('styles.css'),
    new CSSSplitWebpackPlugin({size: 4000, imports: true}),
  ],
};

```

[webpack]: http://webpack.github.io/
[herp]: https://github.com/ONE001/css-file-rules-webpack-separator
[postcss]: https://github.com/postcss/postcss
[postcss-chunk]: https://github.com/mattfysh/postcss-chunk
