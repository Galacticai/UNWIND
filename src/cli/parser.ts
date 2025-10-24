import { Command } from "commander";
import {
  UnwindCommand,
  IUnwindOptions,
  // IUnwindRecoverOptions,
  // IUnwindOptionsRaw,
} from "./types";
import pkg from "../../package.json";
import { ConflictResolution } from "../device/ntfs/FileRecovery.types";
import { parseSelectionArg } from "./util";
import { Device } from "../device/Device";
import { DeviceSource } from "../device/Device.types";
import _ from "lodash";
import { formatObjectString } from "../utils/utils";

export const parseCommand = (argv: string[]): IUnwindOptions => {
  const program = new Command();

  program
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version)
    .argument<UnwindCommand>(
      "<command>",
      "Command to run (analyze or recover)",
      (value) => {
        parseSelectionArg("command", value, ...Object.values(UnwindCommand));
        return value as UnwindCommand;
      }
    )

    .option(
      "--unmount", //
      "Unmount device if mounted",
      false
    )

    .requiredOption<DeviceSource>(
      "-d, --device <path>",
      "Device path (ex: /dev/nvme0n1p1)",
      (value) => {
        if (!Device.isDevice(value)) {
          throw new Error(`Invalid device path: ${value}`);
        }
        return value;
      }
    )

    .option(
      "-o, --output <path>", //
      "Output directory for recovered files"
    )

    .option<number>(
      "-p, --parallel <number>",
      "Number of files to recover in parallel",
      Number,
      100
    )

    .option<number>(
      "--maxSize <number>",
      "max file size (bytes) to recover",
      Number,
      100 * 1024 * 1024 * 1024 //? 100 GB
    )

    .option<number>(
      "--minSize <number>",
      "minimum file size (bytes) to recover",
      Number,
      1 //? skip empty files
    )

    .option<RegExp>(
      "-r, --regex [regex]",
      "Regex filter for file paths",
      (value) => new RegExp(value)
    )

    .option<ConflictResolution>(
      "-c, --conflictResolution [ConflictResolution]",
      "Conflict resolution strategy",
      (value) => {
        parseSelectionArg(
          "conflict resolution",
          value,
          ...Object.values(ConflictResolution)
        );
        return value as ConflictResolution;
      },
      ConflictResolution.ReplaceConflict
    )
    .parse(argv);

  const command = program.args[0] as UnwindCommand;
  const opts = program.opts<IUnwindOptions>();

  // Command-specific validation
  if (command === UnwindCommand.Recover && !opts.output) {
    throw new Error(
      "Output directory is required for recover command. Use --output or -o"
    );
  }

  const optionsParsed = {
    command,
    device: opts.device,
    unmount: opts.unmount,
    ...(command === UnwindCommand.Recover &&
      _.pick(opts, [
        "output",
        "conflictResolution",
        "regex",
        "parallel",
        "maxSize",
        "minSize",
      ])),
  } as IUnwindOptions;

  console.log(
    "\n ❇️ Running with parameters: ",
    ...formatObjectString(optionsParsed, {
      keyFormat: (k) => `     ▫️${k}`,
    })
  );
  return optionsParsed;
};
