import { join } from 'path';
import type tsModule from 'typescript/lib/tsserverlibrary.js';
import { spawnSync } from 'node:child_process';

export function generateDtsSnapshot(ts: typeof tsModule, fileName: string): tsModule.IScriptSnapshot|undefined {
  const mainFile = require.resolve("@ecchi-js/language");
  const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
  const output = spawnSync('node', args, { encoding : 'utf8' });
  //return ts.ScriptSnapshot.fromString(`export type XXXX = '${JSON.stringify(args)}';`);
  return ts.ScriptSnapshot.fromString(output.stdout);
}