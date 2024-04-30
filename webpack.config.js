const path = require('path');

module.exports = {
  entry: './src/index.js',
  // devtool: 'eval',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
};