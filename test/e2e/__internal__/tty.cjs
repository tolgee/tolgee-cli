// ---
// This file is used by `run.ts` to trick the CLI into listening to stdio
// ---

process.stdin.isTTY = true;
process.stdout.isTTY = true;
process.stderr.isTTY = true;
process.stderr.hasColors = () => false;
