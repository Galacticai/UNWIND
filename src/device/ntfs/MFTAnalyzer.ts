import { openSync, readSync, closeSync } from "fs";
import path from "path";
import type {
  IMFTAnalysis,
  IClusterRange,
  IMFTData,
  IMFTEntry,
  IMFTInfo,
  IMFTTimestamps,
} from "./MFTAnalyzer.types";
import { DirectoryTree, TreeNode } from "../../types/types";
import { execute } from "../../utils/run";
import { MFTConstants } from "./MFTConstants";

/**
 * analyze MFT to extract complete directory structure
 * uses parent MFT references for accurate tree building
 */
export class MFTAnalyzer {
  private device: string;

  constructor(device: string) {
    this.device = device;
  }

  /** parse MFT and build directory tree */
  async analyze(): Promise<IMFTAnalysis> {
    const { entries } = await this.parseMFT();
    const tree = this.buildTree(entries);

    const entriesDeleted = entries.filter(
      ({ isDeleted }) => isDeleted //
    );
    const { length: entriesRecoverableLength } = entriesDeleted.filter(
      ({ dataRuns }) => dataRuns.length > 0 //
    );

    return {
      tree,
      entriesStats: {
        total: entries.length,
        deleted: entriesDeleted.length,
        recoverable: entriesRecoverableLength,
      },
    };
  }

  /** parse MFT directly from device */
  private async parseMFT(): Promise<IMFTData> {
    const info = await this.getMFTInfo();
    const entries = await this.readMFTEntries(info);
    return { info, entries };
  }

  /** get MFT location and cluster size using ntfsinfo */
  private async getMFTInfo(): Promise<IMFTInfo> {
    const { stdout, stderr } = await execute(
      `ntfsinfo -m --force ${this.device}`
    );
    // ntfsinfo outputs warnings to stderr even on success, only fail on actual errors
    if (stderr && !stdout) throw new Error("Failed to get MFT info: " + stderr);

    const text = stdout.toString();

    // key values
    const clusterSize = parseInt(
      text.match(/Cluster Size:\s*(\d+)/)?.[1] || "0"
    );
    const mftRecordSize = parseInt(
      text.match(/MFT Record Size:\s*(\d+)/)?.[1] || "0"
    );
    const mftLCN = parseInt(
      text.match(/LCN of Data Attribute for FILE_MFT:\s*(\d+)/)?.[1] || "0"
    );

    if (!clusterSize || !mftRecordSize || !mftLCN) {
      throw new Error("Failed to parse MFT info");
    }

    return {
      clusterSize,
      mftRecordSize,
      mftLCN,
      mftByteOffset: mftLCN * clusterSize,
    };
  }

  /** read and parse raw MFT entries */
  private async readMFTEntries(mftInfo: IMFTInfo): Promise<IMFTEntry[]> {
    const entries: IMFTEntry[] = [];
    const fd = openSync(this.device, "r");

    try {
      const buffer = Buffer.alloc(mftInfo.mftRecordSize);
      let entryNum = 0;
      let consecutiveErrors = 0;

      // read MFT entries until we hit too many invalid records
      while (consecutiveErrors < MFTConstants.limits.MAX_CONSECUTIVE_ERRORS) {
        const offset = mftInfo.mftByteOffset + entryNum * mftInfo.mftRecordSize;

        try {
          readSync(fd, buffer, 0, mftInfo.mftRecordSize, offset);

          // check FILE signature
          const sig = buffer.toString("ascii", 0, 4);
          if (sig !== MFTConstants.SIGNATURE) {
            consecutiveErrors++;
            entryNum++;
            continue;
          }

          consecutiveErrors = 0;
          const entry = this.parseMFTRecord(buffer, entryNum);
          if (entry) entries.push(entry);
        } catch {
          consecutiveErrors++;
        }

        entryNum++;
      }
    } finally {
      closeSync(fd);
    }

    return entries;
  }

  /** Parse single MFT record */
  private parseMFTRecord(
    buffer: Buffer,
    entryNumber: number
  ): IMFTEntry | null {
    // MFT record header
    const flags = buffer.readUInt16LE(MFTConstants.record.FLAGS);
    const isInUse = (flags & MFTConstants.flag.IN_USE) !== 0;
    const isDirectory = (flags & MFTConstants.flag.DIRECTORY) !== 0;

    // first attribute offset
    let attrOffset = buffer.readUInt16LE(
      MFTConstants.record.FIRST_ATTRIBUTE_OFFSET
    );

    let name = "";
    let parent = 0;
    let size = 0;
    const dataRuns: IClusterRange[] = [];
    const timestamps: IMFTTimestamps = {};

    while (attrOffset < buffer.length - 4) {
      const attrType = buffer.readUInt32LE(
        attrOffset + MFTConstants.attributeHeader.TYPE
      );

      if (attrType >= MFTConstants.limits.INVALID_ATTR_TYPE) break;

      const attrLength = buffer.readUInt32LE(
        attrOffset + MFTConstants.attributeHeader.LENGTH
      );
      if (attrLength === 0 || attrLength > MFTConstants.limits.MAX_ATTR_LENGTH)
        break;

      const nonResident = buffer.readUInt8(
        attrOffset + MFTConstants.attributeHeader.NON_RESIDENT_FLAG
      );
      attrType: switch (attrType) {
        case MFTConstants.attributeType.FILE_NAME: {
          if (nonResident === 0) {
            // resident attribute
            const attrDataOffset = buffer.readUInt16LE(
              attrOffset + MFTConstants.resident.DATA_OFFSET
            );
            const dataOffset = attrOffset + attrDataOffset;

            // parent directory reference (first 6 bytes)
            parent =
              buffer.readUIntLE(
                dataOffset + MFTConstants.fileName.PARENT_REFERENCE,
                6
              ) & MFTConstants.limits.PARENT_REF_MASK;

            // filename length and offset
            const nameLength = buffer.readUInt8(
              dataOffset + MFTConstants.fileName.NAME_LENGTH
            );
            const nameOffset = dataOffset + MFTConstants.fileName.NAME_DATA;

            // filename (UTF-16LE)
            name = buffer
              .toString("utf16le", nameOffset, nameOffset + nameLength * 2)
              .replace(/\0/g, "");
          }

          break attrType;
        }

        case MFTConstants.attributeType.DATA: {
          if (nonResident === 0) {
            // resident - size attribute header
            const attrDataSize = buffer.readUInt32LE(
              attrOffset + MFTConstants.resident.DATA_SIZE
            );
            size = attrDataSize;
          } else {
            // non-resident - actual file size is at offset 0x30
            // this is the "real size" field (not allocated size at 0x28)
            try {
              size = Number(
                buffer.readBigUInt64LE(
                  attrOffset + MFTConstants.nonResident.REAL_SIZE
                )
              );
              // sanity check - if size seems wrong, try reading as two 32bit values
              if (
                size < 0 ||
                !isFinite(size) ||
                size > Number.MAX_SAFE_INTEGER
              ) {
                const sizeLow = buffer.readUInt32LE(
                  attrOffset + MFTConstants.nonResident.REAL_SIZE
                );
                const sizeHigh = buffer.readUInt32LE(
                  attrOffset + MFTConstants.nonResident.REAL_SIZE_HIGH
                );
                size = sizeLow + sizeHigh * MFTConstants.limits.TWO_POWER_32;
              }
            } catch {
              size = 0;
            }

            const dataRunOffset = buffer.readUInt16LE(
              attrOffset + MFTConstants.nonResident.DATA_RUNS_OFFSET
            );
            this.parseDataRuns(buffer, attrOffset + dataRunOffset, dataRuns);
          }

          break attrType;
        }
      }

      attrOffset += attrLength;
    }

    if (!name) return null;

    return {
      id: entryNumber,
      idParent: parent,
      name,
      size,
      isDirectory,
      isDeleted: !isInUse,
      dataRuns,
      timestamps,
    };
  }

  /** parse data runs to get cluster locations */
  private parseDataRuns(
    buffer: Buffer,
    offset: number,
    dataRuns: IClusterRange[]
  ): void {
    let currentLCN = 0;
    let pos = offset;

    while (pos < buffer.length) {
      const header = buffer.readUInt8(pos);
      if (header === 0) break;

      const lengthBytes = header & MFTConstants.dataRun.LENGTH_MASK;
      const offsetBytes =
        (header >> MFTConstants.dataRun.OFFSET_SHIFT) &
        MFTConstants.dataRun.OFFSET_MASK;

      if (
        lengthBytes === 0 ||
        lengthBytes > MFTConstants.limits.MAX_DATA_RUN_BYTES ||
        offsetBytes > MFTConstants.limits.MAX_DATA_RUN_BYTES
      )
        break;

      pos++;

      // read run length (cluster count)
      let clusterCount = 0;
      for (let i = 0; i < lengthBytes; i++) {
        clusterCount |= buffer.readUInt8(pos + i) << (i * 8);
      }
      pos += lengthBytes;

      // read run offset (relative LCN)
      let offsetValue = 0;
      for (let i = 0; i < offsetBytes; i++) {
        offsetValue |= buffer.readUInt8(pos + i) << (i * 8);
      }
      pos += offsetBytes;

      // signed offset (for sparse files)
      if (offsetBytes > 0) {
        const signBit = 1 << (offsetBytes * 8 - 1);
        if (offsetValue & signBit) {
          offsetValue -= 1 << (offsetBytes * 8);
        }
      }

      currentLCN += offsetValue;

      if (currentLCN > 0) {
        dataRuns.push({
          start: currentLCN,
          count: clusterCount,
        });
      }
    }
  }

  /** {@link IMFTEntry}s to {@link DirectoryTree} */
  private buildTree(entries: IMFTEntry[]): DirectoryTree<IMFTEntry> {
    const entryMap = new Map<number, TreeNode<IMFTEntry>>();

    // nodes for all entries
    for (const entry of entries) {
      entryMap.set(entry.id, {
        entry,
        children: [],
        path: "",
      });
    }

    // link parents - children
    let root: TreeNode<IMFTEntry> | undefined;
    for (const node of entryMap.values()) {
      if (node.entry.idParent === node.entry.id) {
        // root (parent is self)
        root = node;
        node.path = "";
      } else {
        const parent = entryMap.get(node.entry.idParent);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    if (!root) {
      throw new Error("No root entry found in MFT");
    }

    this.buildPaths(root);

    return { root, entryMap };
  }

  /** build full paths for all nodes */
  private buildPaths(node: TreeNode<IMFTEntry>, parentPath?: string): void {
    if (parentPath === undefined) {
      // root
      node.path = "";
    } else {
      node.path = path.join(
        parentPath,
        node.entry.name + (node.entry.isDirectory ? "/" : "")
      );
    }

    for (const child of node.children) {
      this.buildPaths(child, node.path);
    }
  }
}
