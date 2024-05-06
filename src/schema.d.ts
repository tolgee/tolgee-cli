/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Format for push and pull operations.
 */
export type Format =
  | "JSON_ICU"
  | "JSON_JAVA"
  | "JSON_PHP"
  | "JSON_RUBY"
  | "JSON_C"
  | "PO_PHP"
  | "PO_C"
  | "PO_JAVA"
  | "PO_ICU"
  | "PO_RUBY"
  | "STRINGS"
  | "STRINGSDICT"
  | "APPLE_XLIFF"
  | "PROPERTIES_ICU"
  | "PROPERTIES_JAVA"
  | "PROPERTIES_UNKNOWN"
  | "ANDROID_XML"
  | "FLUTTER_ARB"
  | "YAML_RUBY"
  | "YAML_JAVA"
  | "YAML_ICU"
  | "YAML_PHP"
  | "YAML_UNKNOWN"
  | "XLIFF_ICU"
  | "XLIFF_JAVA"
  | "XLIFF_PHP"
  | "XLIFF_RUBY";
/**
 * File glob specifying which files to include.
 */
export type Path = string;
export type ForceMode = "OVERRIDE" | "KEEP" | "NO_FORCE";

export interface Schema {
  /**
   * The url of Tolgee API.
   */
  apiUrl?: string;
  /**
   * Tolgee API Key. Can be a Project API Key or a Personal Access Token.
   */
  apiKey?: string;
  /**
   * Project ID. Only required when using a Personal Access Token.
   */
  projectId?: number | string;
  /**
   * A path to a custom extractor to use instead of the default one.
   */
  extractor?: string;
  /**
   * File glob patterns to your source code, used for keys extraction.
   */
  patterns?: string[];
  format?: Format;
  push?: {
    files?: FileMatch[];
    languages?: string[];
    namespaces?: string[];
    forceMode?: ForceMode;
    overrideKeyDescriptions?: boolean;
    convertPlaceholdersToIcu?: boolean;
    [k: string]: unknown;
  };
  pull?: {
    /**
     * File
     */
    path?: string;
    /**
     * List of languages to pull. Leave unspecified to export them all.
     */
    languages?: string[];
    /**
     * List of translation states to include. Defaults all except untranslated.
     */
    states?: ("UNTRANSLATED" | "TRANSLATED" | "REVIEWED")[];
    /**
     * List of namespaces to pull. Defaults to all namespaces.
     */
    namespaces?: string[];
    [k: string]: unknown;
  };
  /**
   * Structure delimiter to use. By default, Tolgee interprets `.` as a nested structure. You can change the delimiter, or disable structure formatting by not specifying any value to the option.
   */
  delimiter?: string | null;
  [k: string]: unknown;
}
export interface FileMatch {
  path: Path;
  language: string;
  namespace?: string;
  [k: string]: unknown;
}
