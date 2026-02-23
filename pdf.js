#!/usr/bin/env node

import { runCli } from "./lib/cli.js";

const args = process.argv.slice(2);
runCli(args).then((exitCode) => {
	process.exit(exitCode);
});
