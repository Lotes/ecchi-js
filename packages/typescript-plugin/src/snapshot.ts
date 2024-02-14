import type tsModule from 'typescript/lib/tsserverlibrary.js';
//import { spawnSync } from 'node:child_process';
//import { ScriptLocation } from "@ecchi-js/language/src/generators/script-location.js";

export function generateDtsSnapshot(ts: typeof tsModule, fileName: string): tsModule.IScriptSnapshot|undefined {
  //const output = spawnSync('node', [ScriptLocation, fileName], { encoding : 'utf8' });
  //return output.status === 0 ? ts.ScriptSnapshot.fromString(output.stdout) : undefined;
  return ts.ScriptSnapshot.fromString('export const X: string = "hallo";')
}