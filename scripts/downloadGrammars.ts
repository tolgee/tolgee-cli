// ---
// Downloads TextMate grammars (& licenses) specified in grammars.ts
// ---

import { writeFile } from 'fs/promises';
import {
  type GrammarName,
  Grammars,
  Licenses,
  Transformers,
} from './grammars.js';

import TextMate from 'vscode-textmate';

const TARGET_PATH = new URL('../textmate/', import.meta.url);

const downloaded: Record<string, string> = {};

// Download grammars
for (const [grammarName, grammar] of Object.entries(Grammars) as [
  GrammarName,
  string,
][]) {
  const tm = await fetch(grammar).then((r) => r.text());
  downloaded[grammarName as keyof typeof Grammars] = tm;
}

// Save grammar files
for (const entry of Object.entries(downloaded) as [GrammarName, string][]) {
  const grammarName = entry[0];
  let grammar = entry[1];

  // Transform if necessary
  if (grammarName in Transformers) {
    grammar = Transformers[grammarName as keyof typeof Transformers](
      grammar,
      downloaded
    );
  }

  // Convert to json if necessary, minify
  if (grammar[0] !== '{') {
    grammar = JSON.stringify(TextMate.parseRawGrammar(grammar));
  } else {
    grammar = JSON.stringify(JSON.parse(grammar));
  }

  // Add comment
  grammar = grammar.replace(
    '{',
    `{"//": "Modified grammar from ${Grammars[grammarName]}",`
  );

  await writeFile(new URL(`${grammarName}.tmLanguage`, TARGET_PATH), grammar);
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
