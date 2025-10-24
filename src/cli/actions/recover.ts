import { ELLIPSES, ellipses, formatBytes } from "../../utils/utils";
import path from "path";
import { analyze } from "./analyze";
import { IUnwindRecoverOptions } from "../types";
import type {
  NodeFilterFunction,
  RecoveryProgressFunction,
} from "../../device/ntfs/FileRecovery.types";
import { FileRecovery } from "../../device/ntfs/FileRecovery";
import { ConsoleProgress } from "../../utils/ConsoleProgress";
import chalk from "chalk";

export const recover = async (options: IUnwindRecoverOptions) => {
  const { device, analysis } = await analyze(options);

  const keepNode: NodeFilterFunction = (node) => {
    if (!node.entry.isDeleted) return false;
    if (node.entry.size === 0) return false;
    if (node.entry.size > options.maxSize) return false;
    if (node.entry.dataRuns.length === 0) return false;

    //! not using regex in everything for performance
    if (options.regex) {
      const matches = options.regex.test(node.path);
      return matches;
    } else if (
      node.entry.name === "System Volume Information" ||
      node.entry.name.startsWith("$") ||
      node.entry.name.startsWith(".fuse_hidden")
    ) {
      return false;
    }

    return true;
  };

  const recovery = new FileRecovery({
    device,
    output: options.output,
    conflictResolution: options.conflictResolution,
    keepNode,
  });
  let totalRecoverableSize = 0;

  for (const [, node] of analysis.tree.entryMap) {
    if (
      keepNode(node) &&
      !node.entry.isDirectory &&
      node.entry.dataRuns.length
    ) {
      totalRecoverableSize += node.entry.size;
    }
  }

  console.log(
    "   Total recoverable size:", //
    formatBytes(totalRecoverableSize)
  );

  const consoleProgress = new ConsoleProgress();

  const onProgress: RecoveryProgressFunction = (progress, current) => {
    const parent = ellipses(
      path.dirname(current.path).substring(options.output.length),
      60,
      "center"
    );
    const fileName = ellipses(
      path.basename(current.path), //
      40,
      "center"
    );

    const ratio =
      totalRecoverableSize > 0
        ? progress.stats.totalBytesRecovered / totalRecoverableSize
        : 0;
    const percent = ratio * 100;

    consoleProgress.print(
      "",
      ` 💾 Restoring to ${ellipses(options.output, 60, "center")}${ELLIPSES}`,
      "",
      `    📂 ${parent}`,
      `    └─ ${current.entry.isDirectory ? "📂" : "📄"}` +
        chalk.gray(` (${formatBytes(current.entry.size)})`) +
        ` ${fileName}`,
      "",
      ConsoleProgress.flex({
        indicator: "{flex}",
        line:
          "  🟢 " +
          chalk.green(progress.stats.recovered) +
          "  🟡 " +
          chalk.yellow(progress.stats.partiallyRecovered) +
          "  ⚫️ " +
          chalk.gray(progress.stats.skipped) +
          "  🔴 " +
          chalk.red(progress.stats.failed) +
          "  {flex}",
        flex:
          formatBytes(progress.stats.totalBytesRecovered) +
          " / " +
          chalk.gray(formatBytes(totalRecoverableSize)),
        align: "end",
      }),
      "",
      ConsoleProgress.barFlex({
        ratio,
        indicator: "{bar}",
        filledChar: "█",
        emptyChar: chalk.gray("░"),
        line: " {bar}  " + chalk.bold(percent.toFixed(2) + "%"),
      }),
      ""
    );
  };

  const result = await recovery.recover(
    analysis.tree, //
    onProgress
  );

  consoleProgress.stop();

  console.log("\n\n ✅ Recovery complete:");
  console.log(`    🟢 Fully recovered:`, result.stats.recovered);
  console.log(`    🟡 Partially recovered:`, result.stats.partiallyRecovered);
  console.log(`    ⚫️ Skipped:`, result.stats.skipped);
  console.log(`    🔴 Failed:`, result.stats.failed);
  console.log(
    `    Total bytes:`,
    formatBytes(result.stats.totalBytesRecovered)
  );

  // cleanup
  console.log(
    "\n 🧹 Cleaning up unwanted files that come from ntfsundelete..."
  );
  const isCleaned = await recovery.cleanup();
  if (isCleaned) console.log(" ✅ Cleanup complete");
  else console.warn(" ⚠️  Cleanup had errors (this is normal)");
};
