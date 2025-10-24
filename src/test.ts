import { MFTAnalyzer } from "./device/ntfs/MFTAnalyzer";

const device = "/dev/nvme0n1p1";

const test = async () => {
  if (process.getuid?.() !== 0) {
    console.error(" ❌ Root required");
    process.exit(1);
  }

  console.log(" 🔍 Analyzing MFT...");
  const analyzer = new MFTAnalyzer(device);

  try {
    const result = await analyzer.analyze();

    console.log("\n 📊 Results:");
    console.log(`  Total entries: ${result.entriesStats.total}`);
    console.log(`  Deleted entries: ${result.entriesStats.deleted}`);
    console.log(`  Recoverable: ${result.entriesStats.recoverable}`);

    console.log("\n 📁 Root directory contents:");
    const root = result.tree.root;
    for (const child of root.children.slice(0, 20)) {
      const status = child.entry.isDeleted ? "🔴" : "🟢";
      const type = child.entry.isDirectory ? "📁" : "📄";
      console.log(
        `  ${status} ${type} ${child.entry.name} (MFT: ${child.entry.id}, parent: ${child.entry.idParent})`
      );
    }

    console.log("\n 🔍 Sample deleted files:");
    let count = 0;
    for (const [entryNum, node] of result.tree.entryMap) {
      if (!node.entry.isDeleted) continue;
      if (count >= 10) break;
      const type = node.entry.isDirectory ? "📁" : "📄";
      console.log(
        `  ${type} ${node.path} (size: ${node.entry.size}, MFT: ${entryNum})`
      );
      count++;
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

test();
