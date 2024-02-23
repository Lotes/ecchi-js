import { generate } from "@ecchi-js/language";

export function execute(fileName: string|undefined) {
  if (!fileName) {
    console.error("No filename provided");
    return  undefined;
  }
  return generate(fileName);
}
