import { headless } from "@ecchi-js/language/headless";

export default async function ecchiLoader(source: string) {
  return await headless(source);
}