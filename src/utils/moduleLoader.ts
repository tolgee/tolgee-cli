import { extname } from 'path';
import type { Service } from 'ts-node';

let tsService: Service;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function realImport(file: string) {
  return eval('import(file)');
}

async function registerTsNode() {
  if (!tsService) {
    try {
      const tsNode = require('ts-node');
      tsService = tsNode.register({ compilerOptions: { module: 'CommonJS' } });
    } catch (e: any) {
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error('ts-node is required to load TypeScript files.');
      }
      throw e;
    }
  }
}

async function importTypeScript(file: string) {
  if (extname(__filename) === '.ts') {
    return require(file);
  }

  await registerTsNode();

  tsService.enabled(true);
  const mdl = await realImport(file);
  tsService.enabled(false);

  return mdl;
}

export async function loadModule(module: string) {
  if (module.endsWith('.ts')) {
    return importTypeScript(module);
  }

  const mdl = await realImport(module);
  if (mdl.default?.default) {
    return mdl.default;
  }

  return mdl;
}
