# Tolgee CLI 🐁

A CLI tool to interact with Tolgee directly from your terminal.

The Tolgee CLI lets you pull strings from the Tolgee platform into your projects, push local strings to the Tolgee platform,
extract strings from your code, and much more!

![Tolgee CLI screenshot](tolgee-cli-screenshot.png)

## Installation
The Tolgee CLI is published as a NPM package. You simply need to install it, and you're good to go!

```sh
# npm
npm i --global @tolgee/cli

# Yarn
yarn global add @tolgee/cli

# pnpm
pnpm add --global @tolgee/cli
```

See our [documentation](https://tolgee.io/tolgee-cli/installation) for more information.

### Docker Installation
Alternatively, you can use the Docker image:

```sh
# Pull the latest image
docker pull tolgee/cli:latest

# Run directly
docker run --rm tolgee/cli:latest --help

# Create an alias for easier usage
alias tolgee="docker run --rm -v \$(pwd):/workspace -w /workspace tolgee/cli:latest"
```

The Docker images are available on [Docker Hub](https://hub.docker.com/r/tolgee/cli) and support multiple platforms (linux/amd64, linux/arm64).

## Usage
Once installed, you'll have access to the `tolgee` command. Run `tolgee help` to see all the supported commands, their
options and arguments.

Make sure to give the [docs](https://tolgee.io/tolgee-cli/usage) a look!

## Contributing
Contributions are welcome! Check out [HACKING.md](HACKING.md) for some information about the project internals and
information about the workflow.

----
🧀
