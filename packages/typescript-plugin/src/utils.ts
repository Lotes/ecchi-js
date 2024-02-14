import { EcchiServices } from "@ecchi-js/language";

export function createIsEcchiFile(services: EcchiServices) {
  return (fileName: string): boolean => fileName.endsWith('.ecchi');
}