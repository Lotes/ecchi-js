const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'index.js',
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    extensionAlias: {
     ".js": [".js", ".ts"],
     ".cjs": [".cjs", ".cts"],
     ".mjs": [".mjs", ".mts"]
    }
  },
  externals: [
    'child_process',
    'fs',
    'fs/promises'
  ],
  module: {
    rules: [
      { test: /\.ecchi$/, use: [{loader:"ts-loader"}, {loader:"@ecchi-js/webpack-loader"}]  },
      { test: /\.([cm]?ts|tsx)$/, loader: "ts-loader" },
    ]
  }
};