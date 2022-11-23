import { writeFile } from 'fs/promises';
import { Grammars, Licenses, Transformers } from './grammars.mjs';

const TARGET_PATH = new URL('../textmate/', import.meta.url);

const downloaded = {};

// Download grammars
for (const grammarName in Grammars) {
  if (grammarName in Grammars) {
    const tm = await fetch(Grammars[grammarName]).then((r) => r.text());
    downloaded[grammarName] = tm;
  }
}

// Save grammar files
for (const grammarName in downloaded) {
  if (grammarName in downloaded) {
    let grammar = downloaded[grammarName];

    // Transform if necessary
    if (grammarName in Transformers) {
      grammar = Transformers[grammarName](grammar, downloaded);
    }

    await writeFile(new URL(`${grammarName}.tmLanguage`, TARGET_PATH), grammar);
  }
}

// Save licensing information
let licenseInfoText = 'THIRD PARTY LICENSES\n===\n\n';
for (const license of Licenses) {
  licenseInfoText += 'Licensing information for the following files:\n';
  for (const grammar of license.grammars) {
    licenseInfoText += ` - ${grammar}.tmLanguage`;
    licenseInfoText += '\n';
  }

  licenseInfoText += '\n';
  licenseInfoText += await fetch(license.license).then((r) => r.text());
  licenseInfoText += '\n\n---\n';
}

await writeFile(new URL('THIRD_PARTY_NOTICE', TARGET_PATH), licenseInfoText);
