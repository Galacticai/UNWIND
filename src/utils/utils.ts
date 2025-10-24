export const isRoot = () => process.getuid?.() === 0;

/** deeply copy a {@link value} by serializing and deserializing */
export const copy = <T>(
  value: T,
  replacer?: (this: unknown, key: string, value: unknown) => string,
  reviver?: (this: unknown, key: string, value: string) => unknown
) => {
  return JSON.parse(JSON.stringify(value, replacer), reviver);
};

export const ELLIPSES = "…";
export const ellipses = (
  text: string,
  length: number,
  position: "start" | "center" | "end" | RegExp = "end"
) => {
  if (length <= 1) return ELLIPSES;
  if (text.length <= length) return text;

  if (position instanceof RegExp) {
    return text.replace(position, ELLIPSES);
  }
  switch (position) {
    case "start": {
      return ELLIPSES + text.slice(-(length - 1));
    }
    case "center": {
      const halfLength = Math.floor((length - 1) / 2);
      return (
        text.slice(0, halfLength) +
        ELLIPSES +
        text.slice(-(length - 1 - halfLength))
      );
    }
    case "end": {
      return text.slice(0, length - 1) + ELLIPSES;
    }
    default: {
      return text;
    }
  }
};
export const formatNumber = (bytes: number): string => {
  if (!bytes) return "0 B";
  if (bytes < 0 || !isFinite(bytes)) return "Invalid size";
  const k = 1024;
  const sizes = ["", "K", "M", "G", "T"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  const value = (bytes / Math.pow(k, i)).toFixed(2);
  return `${value} ${sizes[i]}`;
};
export const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  if (bytes < 0 || !isFinite(bytes)) return "Invalid size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  const value = (bytes / Math.pow(k, i)).toFixed(2);
  return `${value} ${sizes[i]}`;
};

export const formatObjectString = <
  T extends object,
  K extends keyof T = keyof T,
  V extends string | number | T[keyof T] = string | number | T[keyof T]
>(
  obj: T,
  options?: {
    separator?: string;
    keyFormat?: (k: K) => string;
    valueFormat?: (v: V) => V[];
  }
) => {
  const entries = Object.entries(obj);
  const longestKeyLength = Math.max(...entries.map(([k]) => k.length));
  return entries.reduce((acc, entry) => {
    const [key, value] = entry as [K, V];
    const keyFormatted = options?.keyFormat?.(key) ?? String(key);
    const keyPadded = keyFormatted.padEnd(longestKeyLength, " ");
    const valueFormatted = options?.valueFormat?.(value) ?? [value];
    const separator = options?.separator ?? ":";
    const res = ["\n", keyPadded, separator, ...valueFormatted] as V[];
    acc.push(...res);
    return acc;
  }, [] as V[]);
};
