import {glob} from "glob";
import {promises as fs} from 'fs';
import path from "path";
import {Client} from "../Client";
import {debug} from "../index";
import { KEY_REGEX } from "../keyRegexp";

export type PossibleKey = {
  string: string,
  line: number,
  position: number
}

export type Extractor = {
  /** Code references that will be dynamically injected into the extractor via `$<key>$` */
  references: Record<string, string | RegExp>
  /** Regexes that'll be used to extract the strings. `%string%` must be present (internally: KEY_REGEX) */
  extraction: Array<string>
}

export class ExtractCommand {
  private readonly extractor: Extractor;
  private client: Client

  constructor(private args: { input: string, customExtractor: string, preset: string, apiKey: string, apiUrl: string }) {
    this.client = new Client(args.apiUrl, args.apiKey);
    this.extractor = this.args.customExtractor ? require(path.resolve(this.args.customExtractor).toString()) : require(`../extractors/${args.preset}`);

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

    const unusedPlatformKeysWithPossibleKeys: Record<string, { fileName: string, line: number, position: number }[]> = {};
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
    const possibleKeys: Map<string, { fileName: string, line: number, position: number }[]> = new Map()
    const discoveredKeys = new Set<string>()

    for (const file of files) {
      debug(`Extracting file: ${file}`)
      const content = await fs.readFile(file, 'utf8');

      debug(`\tExtracting references`)
      const refs = new Map<string, string[]>()
      for (const refId in this.extractor.references) {
        if (refId in this.extractor.references) {
          const extractedRefs: string[] = []
          const regex = new RegExp(this.extractor.references[refId], 'g')
          for (const match of content.matchAll(regex)) {
            extractedRefs.push(match[1])
          }

          if (extractedRefs.length)
            refs.set(refId, extractedRefs)
        }
      }

      debug(`\tPreparing extraction regexes`)
      const regexes = []
      const rawRegexes = [ ...this.extractor.extraction ]
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

      debug(`\tExtracting strings`)
      debug(`\t\tLooking for key-like strings`)
      const lines = content.split(/\r?\n/)
      lines.forEach((lineContent, lineNum) => {
        for (const match of lineContent.matchAll(new RegExp(KEY_REGEX, 'g'))) {
          const string = match[0].trim()
          if (string) {
            if (!possibleKeys.has(string))
              possibleKeys.set(string, [])

            possibleKeys.get(string)!.push({
              fileName: file,
              line: lineNum + 1,
              position: match.index!,
            })
          }
        }
      })

      debug(`\t\tLooking for key usage`)
      for (const regex of regexes) {
        const keys = content.matchAll(regex)
        for (const k of keys) discoveredKeys.add(k[1].trim())
      }
    }

    return {
      keys: [ ...discoveredKeys ],
      possibleKeys: possibleKeys
    }
  }

  private async getFiles() {
    return new Promise<string[]>((resolve, reject) => {
      glob(this.args.input, {nodir: true}, (err, files) => {
        if (err) {
          reject(err)
          return
        }
        resolve(files)
      })
    })
  }
}
