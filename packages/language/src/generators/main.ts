import { NodeFileSystem } from "langium/node";
import { createEcchiServices } from "../ecchi-module.js";
import { readFileSync } from "fs";

const services = createEcchiServices(NodeFileSystem);
const input = readFileSync(process.argv[process.argv.length-1], 'utf8');
const output = services.Ecchi.generator.EcchiGenerator.generate(input);
console.log(output);