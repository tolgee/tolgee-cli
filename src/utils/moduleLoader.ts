import { extname } from 'path';
import type { Service } from 'ts-node';

let tsService: Service;

async function registerTsNode() {
  if (!tsService) {
    try {
      const tsNode = await import('ts-node');
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
  if (extname(import.meta.url) === '.ts') {
    return import(file);
  }

  await registerTsNode();

  tsService.enabled(true);
  const mdl = await import(file);
  tsService.enabled(false);

  return mdl;
}

export async function loadModule(module: string) {
  if (module.endsWith('.ts')) {
    return importTypeScript(module);
  }

  const mdl = await import(module);
  if (mdl.default?.default) {
    return mdl.default;
  }

  return mdl;
}
