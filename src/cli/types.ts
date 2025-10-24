import type { DeviceSource } from "../device/Device.types";
import { IRecoveryOptions } from "../device/ntfs/FileRecovery.types";

export enum UnwindCommand {
  Analyze = "analyze",
  Recover = "recover",
}

export type IUnwindAnalyzeOptions = {
  command: UnwindCommand;
  device: DeviceSource;
  unmount: boolean;
};

export type IUnwindRecoverOptions = IUnwindAnalyzeOptions &
  Pick<
    IRecoveryOptions, //
    "output" | "conflictResolution"
  > & {
    /**
     * path filter (paths to include)
     * - `undefined` = no filtering
     */
    regex?: RegExp;
    /**
     * number of parallel operations
     * - `undefined` = 100
     */
    parallel: number;
    maxSize: number;
    minSize: number;
  };

export type IUnwindOptions = IUnwindAnalyzeOptions & IUnwindRecoverOptions;

export type IUnwindOptionsRaw = Partial<
  Record<
    keyof (IUnwindAnalyzeOptions & IUnwindRecoverOptions), //
    string
  >
>;
