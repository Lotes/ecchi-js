import { spawnSync } from "node:child_process";

const fileName = process.argv[2];
try {
  const mainFile = require.resolve("@ecchi-js/language/main");
  const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
  const output = spawnSync(process.execPath, args, { encoding : 'utf8' });
  console.log(output.stdout);
} catch (e) {
  console.log(`export const TranspilingError = '${JSON.stringify(e)}';`);
}  