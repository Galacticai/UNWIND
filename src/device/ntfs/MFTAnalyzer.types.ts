import type { DirectoryTree } from "../../types/types";

/** File timestamps */
export type IMFTTimestamps = {
  created?: Date;
  modified?: Date;
  accessed?: Date;
  /** MFT record modified time */
  mftModified?: Date;
};

/** Cluster range for file data */
export type IClusterRange = {
  start: number;
  count: number;
};

/** MFT entry metadata from analysis */
export type IMFTEntry = {
  /** MFT entry number */
  id: number;
  /** MFT entry number of parent */
  idParent: number;
  name: string;
  size: number;
  isDirectory: boolean;
  isDeleted: boolean;
  dataRuns: IClusterRange[];
  timestamps: IMFTTimestamps;
};

/** MFT information from ntfsinfo */
export type IMFTInfo = {
  /** Cluster size in bytes */
  clusterSize: number;
  /** MFT record size in bytes */
  mftRecordSize: number;
  /** Logical cluster number of MFT */
  mftLCN: number;
  /** Byte offset of MFT on device */
  mftByteOffset: number;
};

export type IMFTData = {
  info: IMFTInfo;
  entries: IMFTEntry[];
};

export type IMFTAnalysis = {
  tree: DirectoryTree<IMFTEntry>;
  entriesStats: {
    total: number;
    deleted: number;
    recoverable: number;
  };
};
