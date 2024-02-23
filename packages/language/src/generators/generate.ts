import { NodeFileSystem } from "langium/node";
import { createEcchiServices } from "../ecchi-module.js";

export async function generate(input: string) {
  const services = createEcchiServices(NodeFileSystem);
  return await services.Ecchi.generator.EcchiGenerator.generate(input)
}