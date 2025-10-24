export type Awaitable<T = unknown> = T | Promise<T>;

export interface DirectoryTree<T> {
  root: TreeNode<T>;
  entryMap: Map<number, TreeNode<T>>;
}

export interface TreeNode<T> {
  entry: T;
  children: TreeNode<T>[];
  path: string;
}

/** yyyy-MM-dd HH:mm */
export type DateString = //
  `${number}-${number}-${number} ${number}:${number}`;

export type IRecoveryEntry = {
  recoverable: number;
  mftRecord: number;
  type: string;
  filename: string;
  fileFlags: string | "<none>";
  parent: string;
  sizeAlloc: number;
  sizeData: number;
  date: DateString;
  dateC: DateString;
  dateA: DateString;
  dateM: DateString;
  dateR: DateString;
};

export type IRecoveryEntryInfo<T> = {
  regex: RegExp;
  /** `undefined` = keep as string */
  toValue: (raw: string) => T;
};
export type IRecoveryEntryInfos = {
  [K in keyof IRecoveryEntry]: IRecoveryEntryInfo<IRecoveryEntry[K]>;
};
export type IRecoveryEntries = Record<
  IRecoveryEntry["mftRecord"], //
  IRecoveryEntry
>;
