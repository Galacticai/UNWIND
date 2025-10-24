/**
 * NTFS MFT (Master File Table) constants
 * @see https://flatcap.github.io/linux-ntfs/ntfs/attributes/file_name.html
 * @see https://dubeyko.com/development/FileSystems/NTFS/ntfsdoc.pdf
 */
export const MFTConstants = Object.freeze({
  /** MFT record header offsets */
  record: {
    /** Offset to first attribute in MFT record */
    FIRST_ATTRIBUTE_OFFSET: 0x14,
    /** Offset to flags field in MFT record header */
    FLAGS: 0x16,
  },

  /** MFT record flags (at offset 0x16) */
  flag: {
    /** Record is in use (not deleted) */
    IN_USE: 0x01,
    /** Record represents a directory */
    DIRECTORY: 0x02,
  },

  /** NTFS attribute types */
  attributeType: {
    /** Standard Information attribute */
    STANDARD_INFORMATION: 0x10,
    /** File Name attribute */
    FILE_NAME: 0x30,
    /** Data attribute (file content) */
    DATA: 0x80,
  },

  /** Common attribute header offsets */
  attributeHeader: {
    /** Offset to attribute type field */
    TYPE: 0x00,
    /** Offset to attribute length field */
    LENGTH: 0x04,
    /** Offset to non-resident flag */
    NON_RESIDENT_FLAG: 0x08,
  },

  /** Resident attribute offsets (relative to attribute start) */
  resident: {
    /** Offset to data size field */
    DATA_SIZE: 0x10,
    /** Offset to data offset field (points to actual data) */
    DATA_OFFSET: 0x14,
  },

  /** Non-resident attribute offsets (relative to attribute start) */
  nonResident: {
    /** Offset to data runs offset field */
    DATA_RUNS_OFFSET: 0x20,
    /** Offset to allocated size (space on disk) */
    ALLOCATED_SIZE: 0x28,
    /** Offset to real/actual size (logical file size) */
    REAL_SIZE: 0x30,
    /** Upper 32 bits of real size (for 64-bit calculation) */
    REAL_SIZE_HIGH: 0x34,
  },

  /** FILE_NAME attribute structure offsets (relative to attribute data start) */
  fileName: {
    /** Parent directory MFT reference (6 bytes used of 8) */
    PARENT_REFERENCE: 0x00,
    /** Filename length in characters (1 byte) */
    NAME_LENGTH: 0x40,
    /** Filename namespace (1 byte) */
    NAME_NAMESPACE: 0x41,
    /** Start of filename data (UTF-16LE, 2 * NAME_LENGTH bytes) */
    NAME_DATA: 0x42,
  },

  /** Data run parsing constants */
  dataRun: {
    /** Mask for length field in data run header byte */
    LENGTH_MASK: 0x0f,
    /** Bit shift for offset field in data run header byte */
    OFFSET_SHIFT: 4,
    /** Mask for offset field after shifting */
    OFFSET_MASK: 0x0f,
  },

  /** Validation limits */
  limits: {
    /** Maximum consecutive read errors before stopping MFT scan */
    MAX_CONSECUTIVE_ERRORS: 100,
    /** Maximum attribute length (sanity check to prevent invalid reads) */
    MAX_ATTR_LENGTH: 1024,
    /** Invalid attribute type marker (end of attributes) */
    INVALID_ATTR_TYPE: 0xffffffff,
    /** Maximum bytes for data run length/offset fields */
    MAX_DATA_RUN_BYTES: 8,
    /** Mask for 48-bit parent reference (6 bytes = 0xFFFFFFFFFFFF) */
    PARENT_REF_MASK: 0xffffffffffff,
    /** 2^32 for manual 64-bit size calculation */
    TWO_POWER_32: 4294967296,
  },

  /** MFT file record signature */
  SIGNATURE: "FILE",
});
