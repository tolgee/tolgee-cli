# Hacking

Here are some internal info that might be useful for new contributors trying to understand the codebase and how
to get some work done.

## Toolchain

To work on this project, you will just need Node 22+ (and Docker to run tests). We use `npm` to manage dependencies,
and [prettier](https://github.com/prettier/prettier) to lint our code.

## Scripts

These are the runnable scripts with `npm run`:

General:

- `run-dev`: Run the CLI (with [`tsx`](https://github.com/privatenumber/tsx)). Use `--` to pass arguments to the CLI rather than NPM: \
  `npm run run-dev -- extract print --extractor react src/**/*.tsx`
- `build`: Build the CLI.
- `eslint`: Run ESLint.
- `format`: Run ESLint with --fix.
- `schema`: Generate REST API schemas (see [REST Client](#rest-client))

Tests:

- `test`: Run all tests (Unit & E2E). Will start the E2E Tolgee test instance
- `test:unit`: Run unit tests only.
- `test:e2e`: Run e2e tests only. Will start the E2E Tolgee test instance

E2E test instance:

- `tolgee:start`: Start the E2E testing instance. Will be available on port 22222.
- `tolgee:stop`: Stop the E2E testing instance.

### Using an alternative backend for testing

By default, E2E tests will start a Docker container with Tolgee backend on port 22222. If you want to use an alternative backend (e.g., a development server running elsewhere), you can set the `TOLGEE_TEST_BACKEND_URL` environment variable:

```bash
# Use an alternative backend instead of Docker
export TOLGEE_TEST_BACKEND_URL=http://localhost:8080
npm run test:e2e

# Or run with the environment variable inline
TOLGEE_TEST_BACKEND_URL=http://localhost:8080 npm run test:e2e
```

When this environment variable is set, the Docker backend will not be started, and tests will use the specified URL instead.

## Building Docker Images

The project includes Docker support for containerized deployment. The Docker setup consists of:

- `Dockerfile`: Multi-stage build configuration using Node.js 22 Alpine
- `scripts/build-docker.sh`: Comprehensive build script with multi-platform support

### Prerequisites

- Docker installed and running
- For multi-platform builds: Docker Buildx
- For pushing images: Docker Hub credentials

### Building Docker Images

The `scripts/build-docker.sh` script provides several build options:

**Basic build (current platform only):**

```bash
./scripts/build-docker.sh
```

More information about possible build options is documented in the `build-docker.sh`.

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

ApiClient uses `openapi-typescript` to generate typescript schema and `openapi-fetch` for fetching, so it is fully typed client. Endpoints that use `multipart/form-data` are a bit problematic (check `ImportClient.ts`).

### Extractor

The Tolgee Extractor/Code Analyzer is one of the biggest components of the CLI, it has following layers:

1.  TextMate grammars to parse source code files and generate tokens
2.  Mappers (generalMapper, jsxMapper, vueMapper), which rename tokens to general tolgee tokens (which are typed)
    1.  Because tokens are abstracted to general ones, we can reuse many pieces of logic across different file types
3.  Mergers allow merging multiple tokens into one, this has two usecases:
    1. Simplifying tokens (e.g. there are three tokens specifying a string, which can be merged into one)
    2. Generating trigger tokens (e.g. `<T` is merged into `trigger.t.component`) - these triggers are then mapped to custom rules
4.  Very simple semantic tree is then constructed, where we identify blocks, expressions and objects + when there is a trigger, a custom rule is applied and there are special node types for important pieces (like `KeyInfoNode` and `NamespaceInfoNode`)
5.  Last step is generating report from the semantic tree, we look if the values are static or dynamic and because we keep the structure of blocks, we know which `useTranslate` belongs to which `t` function
    1.  Tree can be manipulated before the report is generated (with `treeTransform` function), which is used for `vue` and `svelte`, so the `script` tags are hoisted to the top and so on

#### Adding new TextMate grammars

To add new TextMate grammars, **do not do it manually**! Modify the `scripts/grammars.ts` file following these
steps:

- Add the URL to the grammar file to the `Grammars` dictionary.
- Add applicable licensing information to the `GrammarsLicense` dictionary.
- If you need to transform the TextMate grammar:
  - In the `Transformers` object, add a function that'll receive the raw TextMate grammar
  - Make sure to add a comment to the file stating the file is modified, a link to the original, and a reason for
    the transformation
  - _Hint_: Look at how the transformation for `TypeScriptReact` is done.
- In `src/extractor/tokenizer.ts`:
  - Add a new entry to the `Grammar` enum
  - Add a new entry to the `GrammarFiles` dict
  - Add new cases in the `extnameToGrammar` function

---

Feel free to join the [Slack channel](https://tolg.ee/slack) if you have questions!

Happy hacking 🐀
