# UNWIND

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/platform-Linux-lightgrey)](https://www.kernel.org/)

Restore deleted data from NTFS filesystems using advanced MFT (Master File Table) analysis.

## ✨ Features

- **Deep MFT Analysis** - Direct filesystem analysis for accurate file recovery
- **Smart Recovery** - Filters recoverable files based on data availability
- **Directory Tree Reconstruction** - Maintains original folder structure
- **Parallel Recovery** - Configurable concurrent file recovery operations
- **Flexible Filtering** - Regex pattern matching and size-based filtering
- **Progress Tracking** - Real-time progress indicators for long operations
- **Conflict Resolution** - Multiple strategies for handling existing files

## 📋 Requirements

- **Linux** (tested on Arch Linux with kernel 6.17+)
- **Node.js** 22.0.0 or later
- **Root privileges** (required for direct disk access)
- **ntfs-3g** package installed (`ntfsinfo`, `ntfsundelete`)

## 🚀 Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Link globally (optional)
yarn link
```

## 📖 Usage

### Analyze Command

Scan an NTFS partition and show statistics:

```bash
yarn start analyze -d <device>
```

**Example:**
```bash
yarn start analyze -d /dev/sda1
```

### Recover Command

Recover deleted files from NTFS partition:

```bash
yarn start recover -d <device> -o <output-path> [options]
```

**Options:**
- `-d, --device <path>` - Device path (required, e.g., `/dev/sda1`)
- `-o, --output <path>` - Output directory for recovered files (required)
- `-p, --parallel <number>` - Number of parallel recovery operations (default: `100`)
- `-c, --conflictResolution <strategy>` - How to handle existing files (default: `replace-conflict`)
  - `clear-all` - Remove all existing files in output before recovery
  - `skip-conflict` - Skip files that already exist
  - `replace-conflict` - Overwrite existing files
- `-r, --regex <pattern>` - Filter file paths by regex pattern
- `--maxSize <bytes>` - Maximum file size to recover (default: `107374182400` = 100GB)
- `--minSize <bytes>` - Minimum file size to recover (default: `1` byte)
- `--unmount` - Unmount device if currently mounted

**Full Example:**
```bash
yarn start recover \
  -d /dev/nvme0n1p1 \
  -o "./restored" \
  -p 250 \
  -c clear-all \
  -r "Games/.*" \
  --unmount
```

This command:
- Recovers from `/dev/nvme0n1p1`
- Saves to `./restored` directory
- Processes 250 files in parallel
- Clears output directory before recovery
- Only recovers files matching `Games/.*` pattern
- Unmounts the device if mounted

## 🛠️ Development

```bash
# Run without building
yarn start <command> [options]

# Build for production
yarn build

# Run tests
yarn test
```

### Debug Mode

Enable detailed error output:

```bash
yarn start recover -d /dev/sda1 -o ./output --debug
```

## 🔧 How It Works

1. **MFT Analysis** - Reads the Master File Table directly from the NTFS partition
2. **Entry Parsing** - Extracts file metadata (name, size, parent directory, data runs)
3. **Tree Reconstruction** - Rebuilds directory structure using parent references
4. **Recovery Filtering** - Identifies files with recoverable data (non-zero data runs)
5. **File Recovery** - Uses `ntfsundelete` to extract file contents based on cluster locations
6. **Cleanup** - Removes incomplete or corrupted recovery artifacts

## ⚠️ Limitations

- **Read-only** - Does not modify the source partition
- **NTFS only** - Currently supports NTFS filesystems only
- **Linux only** - Requires Linux-specific tools and direct block device access
- **No guarantees** - File recovery depends on whether data has been overwritten

## 📝 License

GPL-3.0-or-later

## 👤 Author

**galacticai**

## ⚡ Performance Tips

- Increase `-p` (parallel operations) on fast SSDs for better throughput
- Use `--regex` to filter specific directories/files instead of recovering everything
- Set appropriate `--maxSize` to skip large files if disk space is limited
- Large partitions may take several minutes to analyze
- Recovery speed depends on file fragmentation and disk I/O

---

**Note:** Always backup important data regularly. UNWIND is a recovery tool of last resort, not a replacement for proper backup practices.
