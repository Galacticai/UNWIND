import async from "async";
import { mkdirSync, existsSync, rmSync, statSync, truncateSync } from "fs";
import path from "path";
import type { IMFTEntry } from "./MFTAnalyzer.types";
import type {
  IRecoveryOptions,
  IRecoveryResult,
  IRecoveryFile,
  RecoveryProgressFunction,
  IRecoverySingleResult,
  IRecoveryPendingProgress,
} from "./FileRecovery.types";
import {
  ConflictResolution,
  FileRecoveryError,
  RecoveryState,
} from "./FileRecovery.types";
import type { DirectoryTree, TreeNode } from "../../types/types";
import { execute, ExecutionResult } from "../../utils/run";
import { copy } from "../../utils/utils";

/** recover files using MFT structure from analysis  */
export class FileRecovery {
  private options: IRecoveryOptions;

  constructor(options: IRecoveryOptions) {
    options.conflictResolution ??= ConflictResolution.ReplaceConflict;
    this.options = options;
  }

  /**
   * calculate the total recoverable size for a given {@link entryMap}
   * @returns size in bytes
   */
  async getTotalRecoverableSize(
    entryMap: DirectoryTree<IMFTEntry>["entryMap"]
  ) {
    let size = 0;
    for (const [, node] of entryMap) {
      const keep = await this.shouldKeep(node);
      if (!keep) continue;
      if (node.entry.isDirectory) continue;
      if (!node.entry.dataRuns.length) continue;
      size += node.entry.size;
    }
    return size;
  }

  /** recover files according to directory tree structure */
  async recover(
    tree: DirectoryTree<IMFTEntry>,
    onProgress?: RecoveryProgressFunction
  ): Promise<IRecoveryResult> {
    const filesTree = await this.collectFiles(tree);

    const result: IRecoveryResult = {
      files: [],
      stats: {
        total: filesTree.length,
        recovered: 0,
        partiallyRecovered: 0,
        failed: 0,
        skipped: 0,
        totalBytesRecovered: 0,
      },
    };

    const pending: IRecoveryPendingProgress = {
      lastFlush: Date.now(),
      ...copy(result),
    };

    const flushPending = () => {
      result.stats.recovered += pending.stats.recovered;
      result.stats.partiallyRecovered += pending.stats.partiallyRecovered;
      result.stats.failed += pending.stats.failed;
      result.stats.totalBytesRecovered += pending.stats.totalBytesRecovered;
      result.files.push(...pending.files);

      pending.stats.recovered = 0;
      pending.stats.partiallyRecovered = 0;
      pending.stats.failed = 0;
      pending.stats.totalBytesRecovered = 0;
      pending.files.length = 0;
      pending.lastFlush = Date.now();
    };

    const clearAll =
      this.options.conflictResolution === ConflictResolution.ClearAll &&
      existsSync(this.options.output);
    if (clearAll) {
      console.log(` 🗑️ Clearing output directory: ${this.options.output}`);
      rmSync(this.options.output, { recursive: true, force: true });
      mkdirSync(this.options.output, { recursive: true });
    }

    await async.eachOfLimit(
      filesTree,
      this.options.parallel ?? 100,
      async (node) => {
        const filePath = path.normalize(this.options.output + "/" + node.path);

        const currentFile: IRecoveryFile = {
          entry: node.entry,
          path: filePath,
          state: RecoveryState.Recovering,
          bytesRecovered: 0,
        };

        try {
          const recoveryResult = await this.recoverFile(node.entry, filePath);

          currentFile.state = recoveryResult.state;
          currentFile.bytesRecovered = recoveryResult.bytesRecovered;
          currentFile.recoveredFactor = recoveryResult.recoveredFactor;

          if (recoveryResult.state === RecoveryState.Recovered) {
            pending.stats.recovered++;
          } else if (
            recoveryResult.state === RecoveryState.PartiallyRecovered
          ) {
            pending.stats.partiallyRecovered++;
          }
          pending.stats.totalBytesRecovered += recoveryResult.bytesRecovered;

          //
        } catch (error) {
          currentFile.state = RecoveryState.Failed;
          currentFile.error =
            error instanceof Error ? error.message : String(error);
          pending.stats.failed++;
        }

        pending.files.push(currentFile);

        // flush every 100ms
        if (Date.now() - pending.lastFlush >= 100) {
          flushPending();
          await onProgress?.(result, currentFile);
        }
      }
    );

    // final flush
    if (pending.files.length > 0) {
      const lastFile = pending.files[pending.files.length - 1];
      flushPending();
      await onProgress?.(result, lastFile);
    }

    return result;
  }

  /**
   * wrapper for {@link IRecoveryOptions.keepNode}
   * - falls back to `true` if no `keepNode`
   */
  private async shouldKeep(node: TreeNode<IMFTEntry>): Promise<boolean> {
    const keep = await this.options.keepNode?.(node);
    return keep ?? true; //! keep if no filter
  }

  /** collect all file nodes from tree */
  private async collectFiles(tree: DirectoryTree<IMFTEntry>) {
    const files: TreeNode<IMFTEntry>[] = [];

    const traverse = async (node: TreeNode<IMFTEntry>) => {
      const keep = await this.shouldKeep(node);
      if (keep) files.push(node);

      for (const child of node.children) {
        await traverse(child);
      }
    };

    await traverse(tree.root);

    // orphaned files (in entryMap but not in tree)
    for (const node of tree.entryMap.values()) {
      if (node.path) continue;
      const keep = await this.shouldKeep(node);
      if (keep) files.push(node);
    }

    return files;
  }

  /** actual undelete command */
  getUndeleteCommand(entryID: IMFTEntry["id"], outputPath: string) {
    return (
      `ntfsundelete ${this.options.device.source}` +
      " --undelete" +
      ` --inodes ${entryID}` +
      ` --output '${outputPath.replaceAll("'", "'\\''")}'` +
      " --force"
    );
  }
  async undelete(entryID: IMFTEntry["id"], outputPath: string) {
    const cmd = this.getUndeleteCommand(entryID, outputPath);
    return execute(cmd);
  }

  /** recover a file */
  async recoverFile(
    entry: Pick<IMFTEntry, "id" | "size">,
    filePath: string
  ): Promise<IRecoverySingleResult> {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(filePath)) {
      switch (this.options.conflictResolution) {
        case ConflictResolution.SkipConflict:
          return {
            state: RecoveryState.Skipped,
            bytesRecovered: 0,
            recoveredFactor: 0,
          };
        case ConflictResolution.ReplaceConflict:
        case ConflictResolution.ClearAll:
          rmSync(filePath, { force: true });
          break;
      }
    }

    try {
      await this.undelete(entry.id, filePath);

      let bytesRecovered = 0;
      let state = RecoveryState.Failed;

      try {
        bytesRecovered = statSync(filePath).size;

        // ntfsundelete recovers allocated size (rounded to cluster), not actual size
        if (bytesRecovered > entry.size) {
          truncateSync(filePath, entry.size);
          bytesRecovered = entry.size;
        }
        switch (bytesRecovered) {
          case 0:
            state = RecoveryState.Failed;
            break;
          case entry.size:
            state = RecoveryState.Recovered;
            break;
          default:
            state = RecoveryState.PartiallyRecovered;
            break;
        }
      } catch {
        //! performance: this try catch prevents double IO calls - stat only instead of exists+stat
      }

      const recoveredFactor =
        entry.size > 0 //
          ? bytesRecovered / entry.size
          : 0;

      return {
        state,
        bytesRecovered,
        recoveredFactor,
      };
    } catch (e) {
      const error = e as ExecutionResult["error"];
      throw new FileRecoveryError(
        `ntfsundelete failed: ${error?.stderr || error?.message}`
      );
    }
  }

  /**
   * cleanup output directory of ntfsundelete garbage
   * @returns true if cleanup succeeded
   */
  async cleanup(): Promise<boolean> {
    const del = (name: string, regex = false) =>
      `find "${this.options.output}"` +
      (regex ? "-type f -regex" : "-name") +
      `"${name}" -delete;`;
    try {
      const cmd =
        del("*:Zone.Identifier") + //
        del(".fuse_hidden*") +
        del("*.ntfs-3g-*") +
        del(".*\\.[0-9]+", true);

      await execute(cmd);
      return true;
    } catch {
      return false;
    }
  }
}
