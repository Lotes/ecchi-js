const path = require('path');

module.exports = {
  entry: './src/index.ts',
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
  module: {
    rules: [
      { test: /\.ecchi$/, use: ["@ecchi-js/webpack-loader", "ts-loader"]  },
      { test: /\.([cm]?ts|tsx)$/, loader: "ts-loader" },
    ]
  }
};