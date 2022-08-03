import {debug} from "..";
import {Extractor, PossibleKey} from "../commands/extractCommand";
import {KEY_REGEX} from "../keyRegexp";

module.exports = {
  extends: 'react',
  extract: (fileContent: string) => {
    debug('Running extract');
    const lines = fileContent.split(/\r?\n/);
    const possibleKeys: PossibleKey[] = []


    debug('Looking for possible keys...')
    lines.forEach((lineContent, lineNum) => {
      const result = [...lineContent.matchAll(new RegExp(`${KEY_REGEX}+`, "g"))]
      result.forEach((match) => {
        const string = match[0].trim();
        if (string !== "") {
          possibleKeys.push({
            line: lineNum + 1,
            string,
            position: match.index as number
          });
        }
      })
    })

    const regexes = [
      new RegExp(`<T keyName=\\{?[\"'](${KEY_REGEX}+?)[\"']}?`),
      new RegExp(`<T(?: .*|)>(${KEY_REGEX}+)<\/T>}?`)
    ];

    [...fileContent.matchAll(/\s([a-zA-Z0-9_]+)\s?=\s??useTranslate\(\)/g)].forEach(match => {
      const fnName = match[1];
      const standardTRegex = new RegExp(`[^A-Za-z0-9]${fnName}\\(["'\`](${KEY_REGEX}+?)["'\`],?`, "g")
      const optionsObjectTRegex = new RegExp(`[^A-Za-z0-9]${fnName}\\({(?:\\n|.*?)*?key:\\s*['\`"](${KEY_REGEX}+?)['\`"]`, "g")

      regexes.push(standardTRegex, optionsObjectTRegex)
    })

    const regexStr = regexes.map(r => r.source).join("|");
    const regex = new RegExp(regexStr, "g");

    debug('Looking for keys...');
    const matches = fileContent.matchAll(regex);
    const result: string[] = [];
    [...matches].forEach((match) => {
      match.shift()
      result.push(...match)
    })
    return {
      keys: result.filter(item => item !== undefined),
      possibleKeys: possibleKeys
    }
  }
} as Extractor
