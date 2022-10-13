import type { ExtractorRegExp } from '../regexp';

module.exports = <ExtractorRegExp>{
  references: {
    hook: /\s([a-zA-Z0-9_]+)\s?=\s??useTranslate\(\)/g,
  },
  extraction: [
    // React component (JSX)
    '<\\s*T [^>]*?keyName={?["\'`]%string%["\'`]}?',
    '<\\s*T[^>]*?>%string%</T>}?',

    // React component (Plain React.createElement)
    // fixme: nested objects would cancel the `[^}]*?` segment
    'React\\.createElement\\(\\s*T,\\s*{[^}]*?keyName:\\s*["\'`]%string%["\'`]',

    // Hook usage
    '[^A-Za-z0-9_]$hook$\\(["\'`]%string%["\'`],?',
    '[^A-Za-z0-9_]$hook$\\({(?:\\n|.*?)*?key:\\s*[\'`"]%string%[\'`"]',
  ],
};
