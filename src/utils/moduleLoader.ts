import vm from 'vm';
import { readFile } from 'fs/promises';

async function importTypeScript(module: string) {
  const ts = await import('typescript');
  const rawScript = await readFile(module, 'utf8');
  const transpiled = ts.transpileModule(rawScript, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  const vmExports = { __esModule: false };
  const vmMdl = { exports: vmExports };

  const vmCtx = {
    ...globalThis,
    console: console,
    module: vmMdl,
    exports: vmExports,
  };

  vm.runInNewContext(transpiled, vmCtx, { filename: module });

  return vmMdl.exports.__esModule ? vmMdl.exports : { default: vmMdl.exports };
}

export async function loadModule(module: string) {
  return module.endsWith('.ts')
    ? importTypeScript(module)
    : eval('import(module)'); // eval'd to prevent conversion to `require` by TypeScript
}
