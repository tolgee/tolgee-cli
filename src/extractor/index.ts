export type Key = {
  keyName: string;
  defaultValue?: string;
  namespace?: string;
};

export type ExtractedKey = Key & {
  line: number;
  /** Specified when the file differs from the file being processed (sub-file) */
  file?: string;
};

export type Warning = { warning: string; line: number };

export type Extractor = (
  fileContents: string,
  fileName: string
) => ExtractionResult[];

export type ExtractionResult = { keys: ExtractedKey[]; warnings: Warning[] };

export type ExtractionResults = Map<
  string,
  { keys: ExtractedKey[]; warnings: Warning[] }
>;
