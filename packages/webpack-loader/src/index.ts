import { spawnSync } from 'node:child_process';
import type * as webpack from 'webpack';

export interface LoaderOptions {}

function ecchiLoader(
  this: webpack.LoaderContext<LoaderOptions>,
  _contents: string,
  _inputSourceMap?: Record<string, any>
): string {
  const fileName = this.resourcePath;
  const mainFile = require.resolve("@ecchi-js/cli");
  const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
  const output = spawnSync(process.execPath, args, { encoding : 'utf8' });
  return output.stdout;
}

export default ecchiLoader;