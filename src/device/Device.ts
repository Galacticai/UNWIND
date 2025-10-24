import _ from "lodash";
import { execute, ExecutionResult } from "../utils/run";
import type {
  DeviceInfoKey,
  DeviceSource,
  IDeviceInfo,
  IMountOptions,
} from "./Device.types";

export class Device {
  source: DeviceSource;

  constructor(source: DeviceSource) {
    this.source = source;
  }

  static isDevice(source?: string): source is DeviceSource {
    return source?.startsWith("/dev/") ?? false;
  }

  async isMounted() {
    const { mountpoint } = await this.getInfo("mountpoint");
    return !!mountpoint;
  }

  static InfoDefaultKeys = Object.freeze<DeviceInfoKey[]>([
    "name",
    "size",
    "type",
    "fstype",
    "label",
    "uuid",
    "mountpoint",
  ]);

  async getInfo<K extends DeviceInfoKey = DeviceInfoKey>(
    ...columns: K[]
  ): Promise<IDeviceInfo<K>> {
    try {
      const columnsNormalized = columns.length
        ? columns
        : ([...Device.InfoDefaultKeys] as K[]);
      const columnsStr = columnsNormalized.join(",");

      const { stdout } = await execute(
        `lsblk -b -J ${this.source} -o ${columnsStr}`
      );

      const data = JSON.parse(stdout) as { blockdevices: IDeviceInfo[] };
      const device = data.blockdevices[0];

      return _.pick(device, columnsNormalized) as IDeviceInfo<K>;
    } catch (e) {
      const { stderr } = e as ExecutionResult;
      throw new Error("Failed to get device info: " + stderr);
    }
  }

  /** @returns whether device is mounted */
  async mount({
    mountPoint,
    readonly = false,
    remount = false,
  }: IMountOptions): Promise<boolean> {
    const options: string[] = [];
    if (readonly) options.push("ro");
    if (remount) options.push("remount");

    const optionsStr = options.length //
      ? `-o ${options.join(",")}`
      : "";
    const cmd = `mount ${optionsStr} ${this.source} ${mountPoint}`;

    try {
      await execute(cmd);
    } catch {
      //
    }

    return this.isMounted();
  }

  /** @returns whether device is mounted */
  async unmount(): Promise<boolean> {
    try {
      await execute(`umount ${this.source}`);
    } catch {
      //
    }
    return this.isMounted();
  }
}
