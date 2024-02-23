import { readFileSync } from "fs";
import { exit } from "process";
import { generate } from "./generate.js";

const input = readFileSync(process.argv[process.argv.length-1], 'utf8');
generate(input).then(dts => console.log(dts)).catch(e => {
  console.error(e);
  exit(1);
});