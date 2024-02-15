const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".ecchi"],
    extensionAlias: {
     ".js": [".js", ".ts"],
     ".cjs": [".cjs", ".cts"],
     ".mjs": [".mjs", ".mts"]
    }
  },
  module: {
    rules: [
      { test: /\.([cm]?ts|tsx)$/, loader: "ts-loader" },
      { test: /\.ecchi$/, loader: "@ecchi-js/webpack-loader" }
    ]
  }
};