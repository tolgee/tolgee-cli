import {glob} from "glob";
import {promises as fs} from 'fs';
import path from "path";
import {Client} from "../Client";
import {debug} from "../index";

export type PossibleKey = {
  string: string,
  line: number,
  position: number
}

export type Extractor = {
  extract: (fileContent: string) => {
    keys: string[], possibleKeys: PossibleKey[]
  }
}

export class ExtractCommand {
  private readonly extractor: Extractor;
  private client: Client

  constructor(private args: { input: string, customExtractor: string, preset: string, apiKey: string, apiUrl: string }) {
    this.client = new Client(args.apiUrl, args.apiKey);
    this.extractor = this.args.customExtractor ? require(path.resolve(this.args.customExtractor).toString()) : require(`../extractors/${args.preset}`);
    if (typeof this.extractor?.extract !== 'function') {
      throw new Error('Invalid extractor. Extract method is not a function.');
    }
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
    const foundKeys: string[] = [];
    const possibleKeys: Map<string, { fileName: string, line: number, position: number }[]> = new Map()

    for (const file of files) {
      debug(`Extracting file: ${file}`)
      const fileContent = await fs.readFile(file);
      const content = fileContent.toString();
      const extracted = this.extractor.extract(content);
      debug(`File extracted: ${file}`);
      foundKeys.push(...extracted.keys.map(key => key.trim()));
      extracted.possibleKeys.forEach((possibleKey) => {
        if (!possibleKeys.has(possibleKey.string)) {
          possibleKeys.set(possibleKey.string, []);
        }
        try {
          possibleKeys.get(possibleKey.string)?.push({fileName: file, line: possibleKey.line, position: possibleKey.position})
        }catch (e){
          console.log(e, possibleKey.string)
        }
      })
    }
    return {
      keys: [...new Set(foundKeys)],
      possibleKeys: possibleKeys
    }
  }

  private async getFiles() {
    return new Promise<string[]>((resolve, reject) => {
      glob(this.args.input, {nodir: true}, async (err, files) => {
        if (err) {
          reject(err)
        }
        resolve(files)
      })
    })
  }
}
