const path = require("path");

module.exports = {
  webpack: {
    resolve: {
      extensions: ['*', '.mjs', '.js', '.vue', '.json'],
      fallback: {
        crypto: false
      }
    },
    configure: (webpackConfig, _) => {
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      });
      webpackConfig.resolve.fallback = {
        crypto: false
      };
      console.log(webpackConfig);
      return webpackConfig;
    }
  }
};