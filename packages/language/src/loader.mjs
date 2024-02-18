import { URL, pathToFileURL } from "url";

const baseURL = pathToFileURL(`${process.cwd()}/`).href;
const extensionsRegex = /\.ecchi$/;

export function resolve(specifier, context, defaultResolve) {
  const { parentURL = baseURL } = context;
  if (extensionsRegex.test(specifier)) {
    return {
      url: new URL(specifier, parentURL).href,
    };
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export function getFormat(url, context, defaultGetFormat) {
  if (extensionsRegex.test(url)) {
    return {
      format: "module",
    };
  }
  return defaultGetFormat(url, context, defaultGetFormat);
}

export function transformSource(source, context, defaultTransformSource) {
  const { url } = context;
  if (extensionsRegex.test(url)) {
    const mainFile = require.resolve("@ecchi-js/language/main");
    const args = [mainFile, fileName].map(s => s.replace(/\\/g, '/'));
    const output = spawnSync(process.execPath, args, { encoding : 'utf8' });
    return {
      source: output.stdout
    };
  }
  return defaultTransformSource(source, context, defaultTransformSource);
}