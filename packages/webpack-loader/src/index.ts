import { spawnSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import type * as webpack from 'webpack';

export interface LoaderOptions {}

function ecchiLoader(
  this: webpack.LoaderContext<LoaderOptions>,
  contents: string,
  _inputSourceMap?: Record<string, any>
) {
  this.cacheable && this.cacheable();
  const fileName = "./temp.tmp.ts";
  try {
    writeFileSync(fileName, contents, { encoding: 'utf8', flag: 'w' });
    const mainFile = require.resolve("@ecchi-js/language/main");
    const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
    const output = spawnSync('node', args, { encoding : 'utf8' });
    unlinkSync(fileName);
    writeFileSync(fileName+".rslt", output.stdout, { encoding: 'utf8', flag: 'w'});
    return output.stdout;
  } catch (e) {
    writeFileSync(fileName+".err", JSON.stringify(e, null, 2), { encoding: 'utf8', flag: 'w'});
    return `export const TranspilingError = '${JSON.stringify(e)}';`;
  }  
}

export default ecchiLoader;