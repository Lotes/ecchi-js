const { spawnSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');

exports = function(source) {
  const callback = this.async();
  try {
    const fileName = "./temp.tmp.ts";
    writeFileSync(fileName, source, { encoding: 'utf8' });
    const mainFile = require.resolve("@ecchi-js/language/main");
    const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
    const output = spawnSync('node', args, { encoding : 'utf8' });
    callback(null, output.stdout);
  } catch (e) {
    callback(null, `export type XXXX = '${JSON.stringify(e)}';`);
  }  
}