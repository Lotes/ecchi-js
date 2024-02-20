import type tsModule from 'typescript/lib/tsserverlibrary.js';
import { spawnSync } from 'node:child_process';

export function generateSnapshot(ts: typeof tsModule, fileName: string): tsModule.IScriptSnapshot|undefined {
  const mainFile = require.resolve("@ecchi-js/cli");
  const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
  const output = spawnSync(process.execPath, args, { encoding : 'utf8' });
  return ts.ScriptSnapshot.fromString(output.stdout);
}