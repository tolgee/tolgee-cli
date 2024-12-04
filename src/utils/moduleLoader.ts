import type { Jiti } from 'jiti';
import { pathToFileURL } from 'url';

let jiti: Jiti;

// https://github.com/eslint/eslint/blob/6f37b0747a14dfa9a9e3bdebc5caed1f39b6b0e2/lib/config/config-loader.js#L164-L197
async function importTypeScript(file: string) {
  // @ts-ignore
  if (!!globalThis.Bun || !!globalThis.Deno) {
    // We're in an env that natively supports TS
    return import(file);
  }

  if (!jiti) {
    const { createJiti } = await import('jiti').catch(() => {
      throw new Error(
        "The 'jiti' library is required for loading TypeScript extractors. Make sure to install it."
      );
    });

    jiti = createJiti(import.meta.url);
  }

  return jiti.import(file);
}

export async function loadModule(module: string) {
  if (module.endsWith('.ts')) {
    return importTypeScript(module);
  }

  const fileUrl = pathToFileURL(module);
  const mdl = await import(fileUrl.href);
  if (mdl.default?.default) {
    return mdl.default;
  }

  return mdl;
}
