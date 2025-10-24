import { Device } from "../../device/Device";
import { MFTAnalyzer } from "../../device/ntfs/MFTAnalyzer";
import { IMFTAnalysis } from "../../device/ntfs/MFTAnalyzer.types";
import type { IUnwindAnalyzeOptions } from "../types";

export type IAnalyzeResult = {
  device: Device;
  analysis: IMFTAnalysis;
  /** device was originally mounted - so it should be mounted again before exit */
  mountpointOriginal: string | null;
};
export const analyze = async (
  options: IUnwindAnalyzeOptions
): Promise<IAnalyzeResult> => {
  const device = new Device(options.device);

  const deviceInfoInitial = await device.getInfo("fstype", "mountpoint");
  const { mountpoint: mountpointOriginal } = deviceInfoInitial;

  if (deviceInfoInitial.fstype !== "ntfs") {
    throw new Error(`Device is not NTFS: ${options.device}`);
  }
  if (deviceInfoInitial.mountpoint) {
    if (!options.unmount) {
      throw new Error(
        `Device is already mounted: ${deviceInfoInitial.mountpoint}.` +
          "\n   ❇️ Use --unmount"
      );
    }
    console.log(" ⏏️ Unmounting device...");
    const isMounted = await device.unmount();
    if (isMounted) console.log(`    Device unmounted.`);
  }

  console.log("\n 🔍 Analyzing MFT...");
  const analyzer = new MFTAnalyzer(device.source);
  const analysis = await analyzer.analyze();

  console.log("\n 📊 Analysis Results:");
  console.log("   Total entries:", analysis.entriesStats.total);
  console.log("   Deleted entries:", analysis.entriesStats.deleted);
  console.log("   Recoverable (with data):", analysis.entriesStats.recoverable);

  return {
    device,
    analysis,
    mountpointOriginal,
  };
};
