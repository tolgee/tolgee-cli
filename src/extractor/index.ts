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

export type VerboseOption = 'extractor';

export type ExtractOptions = {
  verbose?: VerboseOption[];
  strictNamespace: boolean;
  defaultNamespace: string | undefined;
};

export type ParserType = 'react' | 'vue' | 'svelte';

export type Extractor = (
  fileContents: string,
  fileName: string,
  options: ExtractOptions
) => ExtractionResult;

export type ExtractionResult = { keys: ExtractedKey[]; warnings?: Warning[] };

export type ExtractionResults = Map<string, ExtractionResult>;
