export type DeviceSource = `/dev/${string}`;

export type IMountOptions = {
  mountPoint: string;
  readonly?: boolean;
  remount?: boolean;
};

export type IDeviceInfoFull = {
  name: string;
  size: number;
  type: string;
  fstype: string;
  label: string;
  uuid: string;
  mountpoint: string | null;
};
export type DeviceInfoKey = keyof IDeviceInfoFull;
export type IDeviceInfo<Keys extends DeviceInfoKey = DeviceInfoKey> = {
  [Key in Keys]: IDeviceInfoFull[Key];
};
