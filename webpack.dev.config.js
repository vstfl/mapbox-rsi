const path = require('path');

module.exports = {
  entry: './src/index.js',
  devServer: {
    open: true,
    hot: true,
    contentBase: './dist',
    port: 6000,
    },
    module: {
        rules: [
            {
                test: /\.(m?js|ts)$/,
                exclude: /(node_modules)/,
                use: [`swc-loader`]
            }
        ]
    },
    resolve: {
        extensions: [`.js`,`.ts`],
    }
};