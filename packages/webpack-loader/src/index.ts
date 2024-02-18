import { spawnSync } from 'node:child_process';
import type * as webpack from 'webpack';

export interface LoaderOptions {}

function ecchiLoader(
  this: webpack.LoaderContext<LoaderOptions>,
  _contents: string,
  _inputSourceMap?: Record<string, any>
): string {
  const fileName = this.resourcePath;
  try {
    const mainFile = require.resolve("@ecchi-js/language/main");
    const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
    const output = spawnSync(process.execPath, args, { encoding : 'utf8' });
    return output.stdout;
  } catch (e) {
    return `export const TranspilingError = '${JSON.stringify(e)}';`;
  }  
}

export default ecchiLoader;