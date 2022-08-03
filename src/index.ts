import {Command} from 'commander'
import {ImportCommand} from "./commands/importCommand";
import './fetch-polyfill'
import {ExtractCommand} from "./commands/extractCommand";

const program = new Command();

program
  .name("Tolgee-cli: Tolgee Command Line Interface")
  .description("Tools to work with Tolgee more powerfully")
  .option("-ak, --apiKey <apiKey>")
  .option("-au, --apiUrl <apiUrl>", 'The url of Tolgee API', "https://app.tolgee.io")
  .option('-d, --debug', "Prints debug info")

program.command("import")
  .description("Imports data from tolgee platform")
  .option("-i, --input <inputPath>", 'Directory or single file to import', '.')
  .option("-f, --forceMode <OVERRIDE | KEEP | NO>", 'What should we do with possible conflicts?', 'NO')
  .action(async (options) => {
    await new ImportCommand({
      apiUrl: options.apiUrl,
      apiKey: options.apiKey,
      inputPath: options.input,
      forceMode: options.forceMode
    }).execute()
  })

const extract = program.command("extract")
  .description("Extracts keys from source")
  .option("-i, --input <input>", 'Pattern to match find files in', './**')
  .option("-c, --custom-extractor <customExtractor>", 'JS file with custom extractor', undefined)
  .option("-p, --preset <preset>", 'The preset to use', 'react')


extract.command("print")
  .description("Prints the extracted data")
  .action(async (options) => {
    await new ExtractCommand({
      input: extract.opts().input,
      customExtractor: extract.opts().customExtractor,
      preset: extract.opts().preset,
      apiKey: program.opts().apiKey,
      apiUrl: program.opts().apiUrl
    }).print()
  })

extract.command("compare")
  .action(async (...args) => {
    await new ExtractCommand({
      input: extract.opts().input,
      customExtractor: extract.opts().customExtractor,
      preset: extract.opts().preset,
      apiKey: program.opts().apiKey,
      apiUrl: program.opts().apiUrl,
    }).compare()
  })


export const debug = (msg: string) => {
  if (program.opts().debug) {
    console.log(msg)
  }
}

program.parse();


process.stdout.write("\n\n")
