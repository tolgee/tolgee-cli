# Tolgee CLI 🐁

An experimental 🧪 command line tool to interact with Tolgee directly from your terminal.

The CLI lets you pull strings from the Tolgee platform into your projects, push local strings to the Tolgee platform,
extract strings from your code, and much more!

- Pull requests welcomed! 🤩

## Installation
> **Warning**
> As this package is still highly experimental 🧪, the package is not available yet on NPM. You'll need to install
> it manually if you want to play with it!

Use `npm run run-dev -- <your command & options>` to run the CLI. For example:

`npm run run-dev -- pull --project-id 1337 --api-key tgpak_geztgn27nbsxo53pebugcy3lmv3scijanvsw65zapzphoxt6 i18n`

## Usage
Once installed, you'll have access to the `tolgee` command. Run `tolgee help` to see all the supported commands, their
options and arguments.

## Authentication
You can save authentication tokens via the `tolgee login <api key>` command. Tokens will be stored on disk and will be
used anytime you invoke the CLI.

### Environment variables
In some scenarios (e.g. CI environment), the easiest way to pass sensitive information securely is via environment
variables. You can use the `TOLGEE_API_KEY` environment variable to pass credentials to the CLI.

## Configuration
To avoid having to specify common parameters every time you invoke the CLI, you can set them up for a whole project
via a `.tolgeerc.json` file at the root of your project.

The following parameters are supported:
  - `apiUrl` (string): URL of the Tolgee server. Only needed if you're using a self-hosted installation.
  - `projectId` (number): The ID of the project within Tolgee.

## Contributing
Contributions are welcome! Check out [HACKING.md](HACKING.md) for some information about the project internals and
information about the workflow.

----
🧀
