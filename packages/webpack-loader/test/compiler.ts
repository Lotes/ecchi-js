import path from "path";
import webpack from "webpack";
import { createFsFromVolume, Volume } from "memfs";

export default (fixture: string) => {
  const compiler = webpack({
    context: __dirname,
    entry: fixture,
    output: {
      path: path.resolve(__dirname),
      filename: "bundle.js",
    },
    resolve: {
      fallback: {
        path: require.resolve("path-browserify"),
      }
    },
    module: {
      rules: [
        {
          test: /\.ecchi$/,
          use: ["ts-loader", path.resolve(__dirname, "../out/index.js")],
        },
      ],
    },
  });

  compiler.outputFileSystem = createFsFromVolume(new Volume());
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
