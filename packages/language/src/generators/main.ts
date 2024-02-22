import { readFileSync } from "fs";
import { NodeFileSystem } from "langium/node";
import { createEcchiServices } from "../ecchi-module.js";
import { exit } from "process";

export async function headless(input: string) {
  const services = createEcchiServices(NodeFileSystem);
  return await services.Ecchi.generator.EcchiGenerator.generate(input)
}

const input = readFileSync(process.argv[process.argv.length-1], 'utf8');
headless(input).then(dts => console.log(dts)).catch(e => {
  console.error(e);
  exit(1);
});