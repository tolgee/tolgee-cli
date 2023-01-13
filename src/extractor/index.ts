export type Key = {
  keyName: string;
  defaultValue?: string;
  namespace?: string;
};

export type ExtractedKey = Key & {
  line: number;
};

export type Warning = { warning: string; line: number };

export type Extractor = (fileContents: string, fileName: string) => string[];

export type ExtractionResult = { keys: ExtractedKey[]; warnings: Warning[] };

export type ExtractionResults = Map<
  string,
  { keys: ExtractedKey[]; warnings: Warning[] }
>;
