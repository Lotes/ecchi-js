import type tsModule from 'typescript/lib/tsserverlibrary.js';
import { createIsEcchiFile } from './utils.js';
import { createEcchiServices } from '@ecchi-js/language';
import { NodeFileSystem } from 'langium/node';
import {existsSync} from 'fs';
import { generateDtsSnapshot } from './snapshot.js';

const init: tsModule.server.PluginModuleFactory = ({ typescript: ts }) => {
  const services = createEcchiServices(NodeFileSystem);
  const isEcchiFile = createIsEcchiFile(services.Ecchi);

  function create(
    info: tsModule.server.PluginCreateInfo,
  ): tsModule.LanguageService {
    const languageServiceHost = {} as Partial<tsModule.LanguageServiceHost>;
    const languageServiceHostProxy = new Proxy(info.languageServiceHost, {
      get(target, key: keyof tsModule.LanguageServiceHost) {
        return languageServiceHost[key]
          ? languageServiceHost[key]
          : target[key];
      },
    });

    const languageService = ts.createLanguageService(languageServiceHostProxy);

    languageServiceHost.getScriptKind = (fileName) => {
      if (!info.languageServiceHost.getScriptKind) {
        return ts.ScriptKind.Unknown;
      }
      if (isEcchiFile(fileName)) {
        return ts.ScriptKind.TS;
      }
      return info.languageServiceHost.getScriptKind(fileName);
    };

    languageServiceHost.getScriptSnapshot = (fileName) => {
      if (isEcchiFile(fileName) && existsSync(fileName)) {
        return generateDtsSnapshot(ts, fileName);
      }
      return info.languageServiceHost.getScriptSnapshot(fileName);
    };
    
    return languageService;
  }

  function getExternalFiles(
    project: tsModule.server.ConfiguredProject,
  ): string[] {
    return project.getFileNames().filter(isEcchiFile);
  }

  return { create, getExternalFiles };
};

export default init;
