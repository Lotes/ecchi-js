import { EmptyFileSystem } from "langium";
import { createEcchiServices } from "../ecchi-module.js";
import { readFile } from "fs/promises";

export async function generate(fileName: string) {
  const services = createEcchiServices(EmptyFileSystem);
  const input = await readFile(fileName, 'utf-8');
  return await services.Ecchi.generator.EcchiGenerator.generate(input)
}