import path from "path";
import webpack from "webpack";
import fs from "fs";

export default (fixture: string) => {
  const compiler = webpack({
    context: __dirname,
    entry: fixture,
    output: {
      path: path.resolve(__dirname),
      filename: "bundle.js",
    },
    externals: [
      'child_process',
      'fs',
      'fs/promises'
    ],
    module: {
      rules: [
        {
          test: /\.ecchi$/,
          use: [{loader: "ts-loader"}, {loader: path.resolve(__dirname, "../out/index.js")}],
        },
      ],
    },
  });

  compiler.outputFileSystem = fs;
  compiler.outputFileSystem.join = path.join.bind(path);

  return new Promise<webpack.Stats>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);
      if (!stats) return reject(new Error("No stats"));
      if (stats.hasErrors()) return reject(stats.toJson().errors);
      resolve(stats);
    });
  });
};
