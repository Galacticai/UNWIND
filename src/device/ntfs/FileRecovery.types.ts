import type { TreeNode, Awaitable } from "../../types/types";
import type { Device } from "../Device";
import type { IMFTEntry } from "./MFTAnalyzer.types";

export class FileConflictError extends Error {}
export class FileRecoveryError extends Error {}

export enum ConflictResolution {
  /** clear everything before recovery */
  ClearAll = "clear-all",
  /** skip files that already exist */
  SkipConflict = "skip-conflict",
  /** replace files that already exist with the newly recovered ones */
  ReplaceConflict = "replace-conflict",
}
/** Recovery operation options */
export type IRecoveryOptions = {
  output: string;
  conflictResolution: ConflictResolution;
  parallel?: number;

  device: Device;
  /** parent directory for recovered files */
  /**
   * filter {@link TreeNode}s of {@link IMFTEntry}
   * - `undefined` = no filter
   * @returns whether to add entry (true) or not (false)
   */
  keepNode?: NodeFilterFunction;
};

/**
 * filter entries
 * - `undefined` = no filter
 * @returns whether to add entry (true) or not (false)
 */
export type NodeFilterFunction = //
  (node: TreeNode<IMFTEntry>) => Awaitable<boolean>;

export enum RecoveryState {
  Pending = "pending",
  Recovering = "recovering",
  Recovered = "recovered",
  PartiallyRecovered = "partially-recovered",
  Failed = "failed",
  Skipped = "skipped",
}

export type IRecoverySingleResult = {
  state: RecoveryState;
  bytesRecovered: number;
  /** expected size VS actual recovered size (factor 0--1) */
  recoveredFactor?: number;
};
/** Recovery status for a single file */
export type IRecoveryFile = {
  entry: IMFTEntry;
  path: string;
  error?: string;
} & IRecoverySingleResult;

/** Recovery result with progress tracking */
export type IRecoveryResult = {
  files: IRecoveryFile[];
  stats: {
    total: number;
    recovered: number;
    partiallyRecovered: number;
    failed: number;
    skipped: number;
    totalBytesRecovered: number;
  };
};
/** Recovery result with progress tracking */
export type IRecoveryPendingProgress = IRecoveryResult & {
  /** time in milliseconds */
  lastFlush: number;
};

export type RecoveryProgressFunction = (
  result: IRecoveryResult, //
  current: IRecoveryFile
) => Awaitable<void>;
