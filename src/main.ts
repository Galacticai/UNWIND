#!/usr/bin/env node
import { analyze } from "./cli/actions/analyze";
import { recover } from "./cli/actions/recover";
import { parseCommand } from "./cli/parser";
import {
  type IUnwindAnalyzeOptions,
  type IUnwindRecoverOptions,
  UnwindCommand,
} from "./cli/types";
import { isRoot } from "./utils/utils";

const main = async () => {
  const DEBUG = process.argv.includes("--debug");
  try {
    if (!isRoot()) {
      throw new Error("Root required. Use sudo.");
    }

    const options = parseCommand(process.argv);

    switch (options.command) {
      case UnwindCommand.Analyze:
        await analyze(options as IUnwindAnalyzeOptions);
        break;
      case UnwindCommand.Recover:
        await recover(options as IUnwindRecoverOptions);
        break;
    }
    //
  } catch (error) {
    console.error(
      "\n❌",
      DEBUG //
        ? error
        : (error as Error)?.message ?? error,
      "\n"
    );
    process.exit(1);
  }
};

main();
