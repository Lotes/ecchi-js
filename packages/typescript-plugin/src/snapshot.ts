import type tsModule from 'typescript/lib/tsserverlibrary.js';
import { spawnSync } from 'node:child_process';

export function generateSnapshot(ts: typeof tsModule, fileName: string): tsModule.IScriptSnapshot|undefined {
  try {
    const mainFile = require.resolve("@ecchi-js/language/main");
    const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
    const output = spawnSync('node', args, { encoding : 'utf8' });
    return ts.ScriptSnapshot.fromString(output.stdout);
  } catch (e) {
    return ts.ScriptSnapshot.fromString(`export type XXXX = '${JSON.stringify(e)}';`);
  }  
}