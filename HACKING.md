# Hacking
Here are some internal info that might be useful for new contributors trying to understand the codebase and how
to get some work done.

## Toolchain
To work on this project, you will just need Node 16+ (and Docker to run tests). We use `npm` to manage dependencies,
and [prettier](https://github.com/prettier/prettier) to lint our code.

## Scripts
These are the runnable scripts with `npm run`:

General:
 - `run-dev`: Run the CLI (with `ts-node`). Use `--` to pass arguments to the CLI rather than NPM: \
   `npm run run-dev -- extract print --extractor react src/**/*.tsx`
 - `build`: Build the CLI.
 - `prettier`: Run Prettier.
 - `lint`: Run Prettier but does not update files (report-only).
 - `schema`: Generate REST API schemas (see [REST Client](#rest-client))

Tests:
 - `test`: Run all tests (Unit & E2E). Will start (and stop) the E2E Tolgee test instance
 - `test:unit`: Run unit tests only.
 - `test:e2e`: Run e2e tests only. Will start (and stop) the E2E Tolgee test instance
 - `test:e2e-run`: Run e2e tests only. Will not start/stop the E2E Tolgee test instance

E2E test instance:
 - `tolgee:start`: Start the E2E testing instance. Will be available on port 22222.
 - `tolgee:stop`: Stop the E2E testing instance.

## Code & internals overview
### Command parsing
The CLI uses [commander.js](https://github.com/tj/commander.js) to handle the whole command parsing & routing logic.
As the way we deal with arguments is more complex than what the library can do by itself, we have some extra validation
logic.

### Config loading & validation
We use [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) to handle the loading of the `.tolgeerc` file.
There is also a module that manages the authentication token store (`~/.tolgee/authentication.json`). These modules
can be found in `src/config`.

The `.tolgeerc` file is loaded at program startup, and the tokens (which depend on options) are loaded before our
custom validation logic.

### REST Client
The REST Client to interact with the Tolgee API is a light abstraction that uses types generated from our OpenAPI
specifications. Feel free to add new methods in the client if you need them. It can be found in `src/config`.

### Extractor
The Tolgee Extractor/Code Analyzer is one of the biggest components of the CLI. Tolgee uses TextMate grammars to
parse source code files, and then uses states machines powered by [XState](https://github.com/statelyai/xstate) to
perform the actual extraction.

#### Adding new TextMate grammars
To add new TextMate grammars, **do not do it manually**! Modify the `scripts/grammars.js` file following these
steps:

 - Add the URL to the grammar file to the `Grammars` dictionary.
 - Add applicable licensing information to the `GrammarsLicense` dictionary.
 - If you need to transform the TextMate grammar:
   - In the `Transformers` object, add a function that'll receive the raw TextMate grammar
   - Make sure to add a comment to the file stating the file is modified, a link to the original, and a reason for
     the transformation
   - *Hint*: Look at how the transformation for `TypeScriptReact` is done.
 - In `src/extractor/tokenizer.ts`:
   - Add a new entry to the `Grammar` enum
   - Add a new entry to the `GrammarFiles` dict
   - Add new cases in the `extnameToGrammar` function

----
Feel free to join the [Slack channel](https://tolg.ee/slack) if you have questions!

Happy hacking 🐀
