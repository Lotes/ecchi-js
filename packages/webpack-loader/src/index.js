import { headless } from "@ecchi-js/language/headless";

export default async function ecchiLoader(source) {
  return await headless(source);
}