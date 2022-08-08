import {glob} from "glob";
import {promises as fs} from 'fs';
import path from "path";
import {Client} from "../Client";
import {debug} from "../index";
import { KEY_REGEX } from "../keyRegexp";

export type PossibleKey = {
  fileName: string
  line: number
  position: number
}

export type ExtractorRegExp = {
  /** Code references that will be dynamically injected into the extractor via `$<key>$` */
  references: Record<string, string | RegExp>
  /** Regexes that'll be used to extract the strings. `%string%` must be present (internally: KEY_REGEX) */
  extraction: Array<string>
}

export type ExtractorFunction = {
  extractor: (fileContents: string) => string[]
}

export type Extractor = ExtractorRegExp | ExtractorFunction

export class ExtractCommand {
  private readonly extractor: Extractor;
  private client: Client

  constructor(private args: { input: string, customExtractor: string, preset: string, apiKey: string, apiUrl: string }) {
    this.client = new Client(args.apiUrl, args.apiKey);
    this.extractor = this.args.customExtractor
      ? require(path.resolve(this.args.customExtractor).toString())
      : require(`../extractors/${args.preset}`);

    // xxx: validate user-provided extractor
    // if (typeof this.extractor?.extract !== 'function') {
    //   throw new Error('Invalid extractor. Extract method is not a function.');
    // }
  }

  async print() {
    const keys = await this.extractKeys();
    keys.keys.forEach(i => console.log(i));
    console.log(`Found: ${keys.keys.length} keys.`)
  }

  async compare() {
    const platformKeys = await this.client.getAllKeys()
    const extracted = await this.extractKeys();

    const localKeysNotInPlatform = [...extracted.keys];
    platformKeys.forEach((platformKey) => {
      const idx = localKeysNotInPlatform.indexOf(platformKey)
      if (idx > -1) {
        localKeysNotInPlatform.splice(idx, 1);
      }
    })

    const unusedPlatformKeys = [...platformKeys];
    extracted.keys.forEach((localKey) => {
      const idx = unusedPlatformKeys.indexOf(localKey)
      if (idx > -1) {
        unusedPlatformKeys.splice(idx, 1);
      }
    })

    const unusedPlatformKeysWithPossibleKeys: Record<string, PossibleKey[]> = {};
    unusedPlatformKeys.forEach(key => {
        unusedPlatformKeysWithPossibleKeys[key] = extracted.possibleKeys.get(key) || [];
      }
    )

    console.log("\nThese local keys were not found in platform:\n");
    localKeysNotInPlatform.forEach(key => {
      console.log(key);
    })

    console.log("\nThese keys from platform were not found locally:\n");
    Object.entries(unusedPlatformKeysWithPossibleKeys).forEach(([key, occurrences]) => {
      console.log(key)
      occurrences.forEach((occurrence) => {
        console.log(`    ${occurrence.fileName}:${occurrence.line}:${occurrence.position}`);
      })
    })
  }

  private async extractKeys() {
    const files = await this.getFiles();
    const possibleKeys: Map<string, PossibleKey[]> = new Map()
    const discoveredKeys = new Set<string>()

    for (const file of files) {
      debug(`Extracting file: ${file}`)
      const content = await fs.readFile(file, 'utf8');

      debug(`\tExtracting key-like strings`)
      for (const [ string, line, position ] of this.findKeyLikeStrings(content)) {
        if (!possibleKeys.has(string))
          possibleKeys.set(string, [])

        possibleKeys.get(string)!.push({ fileName: file, line, position })
      }

      debug(`\tLooking for key usage`)
      this.findUsages(content).forEach((s) => discoveredKeys.add(s))
    }

    return {
      keys: [ ...discoveredKeys ],
      possibleKeys: possibleKeys
    }
  }

  private *findKeyLikeStrings (content: string): Generator<[ string, number, number ]> {
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const match of line.matchAll(new RegExp(KEY_REGEX, 'g'))) {
        const string = match[0].trim()
        if (string) yield [ string, i + 1, match.index! ]
      }
    }
  }

  private findUsages (content: string): string[] {
    if ('extraction' in this.extractor) {
      debug(`\t\tUsing RegExp extractor`)
      return this.regexExtractorRunner(content)
    }

    debug(`\t\tUsing user-provided extractor`)
    return this.extractor.extractor(content)
  }

  private extractReferences (content: string, extractor: ExtractorRegExp): Map<string, string[]> {
    const refs = new Map<string, string[]>()
    for (const refId in extractor.references) {
      if (refId in extractor.references) {
        const extractedRefs: string[] = []
        const regex = new RegExp(extractor.references[refId], 'g')
        for (const match of content.matchAll(regex)) {
          extractedRefs.push(match[1])
        }

        if (extractedRefs.length)
          refs.set(refId, extractedRefs)
      }
    }

    return refs
  }

  private prepareRegexes (refs: Map<string, string[]>, extractor: ExtractorRegExp): RegExp[] {
    const regexes = []
    const rawRegexes = [ ...extractor.extraction ]
    const referenceRegex = /\$([a-z0-9_]+)\$/
    for (const rawRegex of rawRegexes) {
      const referenceMatch = rawRegex.match(referenceRegex)
      if (referenceMatch) {
        if (refs.has(referenceMatch[1])) {
          for (const resolvedRef of refs.get(referenceMatch[1])!) {
            rawRegexes.push(rawRegex.replace(referenceMatch[0], resolvedRef))
          }
        }

        continue
      }

      regexes.push(new RegExp(rawRegex.replace('%string%', `(${KEY_REGEX})`), 'g'))
    }

    return regexes
  }

  private regexExtractorRunner (content: string): string[] {
    const extractor = this.extractor as ExtractorRegExp

    // perf: deduplicating here is not necessary and would not be worth doing since an additional
    // dedupe would be necessary to remove dupes across different files. as such, let's use a plain array.
    const discoveredKeys = []

    debug(`\t\tExtracting references`)
    const refs = this.extractReferences(content, extractor)

    debug(`\t\tPreparing extraction regexes`)
    const regexes = this.prepareRegexes(refs, extractor)

    for (const regex of regexes) {
      const keys = content.matchAll(regex)
      for (const k of keys) discoveredKeys.push(k[1].trim())
    }

    return discoveredKeys
  }

  private async getFiles() {
    return new Promise<string[]>((resolve, reject) => {
      glob(this.args.input, {nodir: true}, (err, files) => {
        if (err) return reject(err)
        resolve(files)
      })
    })
  }
}
