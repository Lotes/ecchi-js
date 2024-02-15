import { readFileSync } from "fs";
import { headless } from "./headless.js";

const input = readFileSync(process.argv[process.argv.length-1], 'utf8');
headless(input).then(dts => console.log(dts));