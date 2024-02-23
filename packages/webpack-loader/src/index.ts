import { spawnSync } from 'child_process';
import webpack from 'webpack';

export interface LoaderOptions {}

function normalize(path: string) {
  return path.replace(/\\/g, '/');
}

function ecchiLoader(
  this: webpack.LoaderContext<LoaderOptions>,
  _contents: string,
  _inputSourceMap?: Record<string, any>
) {
  const { resourcePath, callback } = this;
  const mainFile = normalize(require.resolve("@ecchi-js/cli"));
  const nodeFile = normalize(process.execPath);
  const ecchiFile = normalize(resourcePath);
  const {stdout} = spawnSync(nodeFile, [mainFile, ecchiFile], {encoding: 'utf-8'})
  callback(null, stdout);
}

export default ecchiLoader;
