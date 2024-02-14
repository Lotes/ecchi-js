import type tsModule from 'typescript/lib/tsserverlibrary.js';
import { createIsEcchiFile } from './utils.js';
import { createEcchiServices } from '@ecchi-js/language';
import {existsSync} from 'fs';
import { generateDtsSnapshot } from './snapshot.js';
import { dirname, resolve } from 'path';
import { EmptyFileSystem } from 'langium';

type ModuleResolverFunction = (containingFile: string) => (moduleName: string, resolveModule: () => tsModule.ResolvedModuleWithFailedLookupLocations | undefined) => tsModule.ResolvedModuleFull | undefined;
const isRelative = (fileName: string) => /^\.\.?($|[\\/])/.test(fileName);

const init: tsModule.server.PluginModuleFactory = ({ typescript: ts }) => {
  const services = createEcchiServices(EmptyFileSystem);
  const isEcchiFile = createIsEcchiFile(services.Ecchi);

  function create(
    info: tsModule.server.PluginCreateInfo,
  ): tsModule.LanguageService {
    const languageServiceHost = {} as Partial<tsModule.LanguageServiceHost>;
    const languageService = createLanguageService(info, languageServiceHost, ts);
    const createModuleResolver = createModuleResolverFactory(isEcchiFile, ts);

    appendScriptKind(languageServiceHost, info, ts, isEcchiFile);
    appendScriptSnapshot(languageServiceHost, isEcchiFile, ts, info);
    appendTypescript5xModuleResolution(languageServiceHost, info, ts, createModuleResolver);
    appendTypescript4xModuleResolution(languageServiceHost, info, ts, createModuleResolver);

    return languageService;
  }

  function getExternalFiles(
    project: tsModule.server.ConfiguredProject,
  ): string[] {
    return project.getFileNames().filter(isEcchiFile);
  }

  return { create, getExternalFiles };
};

function createModuleResolverFactory(isEcchiFile: (fileName: string) => boolean, ts: typeof tsModule) {
  return (containingFile: string) => (moduleName: string, _resolveModule: () => tsModule.ResolvedModuleWithFailedLookupLocations | undefined): tsModule.ResolvedModuleFull | undefined => {
    if (isEcchiFile(moduleName)) {
      if (isRelative(moduleName)) {
        return {
          extension: ts.Extension.Dts,
          isExternalLibraryImport: false,
          resolvedFileName: resolve(
            dirname(containingFile),
            moduleName
          ),
        };
      }
    }
    return undefined;
  };
}

function appendScriptSnapshot(languageServiceHost: Partial<tsModule.LanguageServiceHost>, isEcchiFile: (fileName: string) => boolean, ts: typeof tsModule, info: tsModule.server.PluginCreateInfo) {
  languageServiceHost.getScriptSnapshot = (fileName) => {
    if (isEcchiFile(fileName) && existsSync(fileName)) {
      return generateDtsSnapshot(ts, fileName);
    }
    return info.languageServiceHost.getScriptSnapshot(fileName);
  };
}

function appendScriptKind(languageServiceHost: Partial<tsModule.LanguageServiceHost>, info: tsModule.server.PluginCreateInfo, ts: typeof tsModule, isEcchiFile: (fileName: string) => boolean) {
  languageServiceHost.getScriptKind = (fileName) => {
    if (!info.languageServiceHost.getScriptKind) {
      return ts.ScriptKind.Unknown;
    }
    if (isEcchiFile(fileName)) {
      return ts.ScriptKind.TS;
    }
    return info.languageServiceHost.getScriptKind(fileName);
  };
}

function createLanguageService(info: tsModule.server.PluginCreateInfo, languageServiceHost: Partial<tsModule.LanguageServiceHost>, ts: typeof tsModule) {
  const languageServiceHostProxy = new Proxy(info.languageServiceHost, {
    get(target, key: keyof tsModule.LanguageServiceHost) {
      return languageServiceHost[key]
        ? languageServiceHost[key]
        : target[key];
    },
  });

  const languageService = ts.createLanguageService(languageServiceHostProxy);
  return languageService;
}

function appendTypescript5xModuleResolution(languageServiceHost: Partial<tsModule.LanguageServiceHost>, info: tsModule.server.PluginCreateInfo, ts: typeof tsModule, createModuleResolver: ModuleResolverFunction) {
  if (info.languageServiceHost.resolveModuleNameLiterals) {
    const _resolveModuleNameLiterals =
      info.languageServiceHost.resolveModuleNameLiterals.bind(
        info.languageServiceHost
      );
  
    languageServiceHost.resolveModuleNameLiterals = (
      moduleNames,
      containingFile,
      ...rest
    ) => {
      const resolvedModules = _resolveModuleNameLiterals(
        moduleNames,
        containingFile,
        ...rest
      );
  
      const moduleResolver = createModuleResolver(containingFile);
  
      return moduleNames.map(({ text: moduleName }, index) => {
        try {
          const resolvedModule = moduleResolver(
            moduleName,
            () => resolvedModules[index]
          );
          if (resolvedModule) return { resolvedModule };
        } catch (e) {
          return resolvedModules[index];
        }
        return resolvedModules[index];
      });
    };
  }
}

function appendTypescript4xModuleResolution(languageServiceHost: Partial<tsModule.LanguageServiceHost>, info: tsModule.server.PluginCreateInfo, ts: typeof tsModule, createModuleResolver: ModuleResolverFunction) {
  if (info.languageServiceHost.resolveModuleNames) {
    const _resolveModuleNames = info.languageServiceHost.resolveModuleNames.bind(
      info.languageServiceHost
    );
  
    languageServiceHost.resolveModuleNames = (
      moduleNames,
      containingFile,
      ...rest
    ) => {
      const resolvedModules = _resolveModuleNames(
        moduleNames,
        containingFile,
        ...rest
      );
  
      const moduleResolver = createModuleResolver(containingFile);
  
      return moduleNames.map((moduleName, index) => {
        try {
          const resolvedModule = moduleResolver(moduleName, () =>
            languageServiceHost.getResolvedModuleWithFailedLookupLocationsFromCache?.(
              moduleName,
              containingFile
            )
          );
          if (resolvedModule) return resolvedModule;
        } catch (e) {
          return resolvedModules[index];
        }
        return resolvedModules[index];
      });
    };
  }
}

export default init;