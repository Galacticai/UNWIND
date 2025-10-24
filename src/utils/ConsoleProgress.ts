import type {
  IBarConfig,
  IFlexConfig,
  IBarFlexConfig,
} from "./ConsoleProgress.types";

export class ConsoleProgress {
  private lastLineCount = 0;

  static get consoleWidth() {
    return process.stdout.columns || 80;
  }

  print(...lines: string[]) {
    if (this.lastLineCount > 0) {
      process.stdout.write("\r");

      for (let i = 0; i < this.lastLineCount; i++) {
        process.stdout.write("\x1b[2K");
        if (i < this.lastLineCount - 1) {
          process.stdout.write("\x1b[1B");
        }
      }

      process.stdout.write(`\x1b[${this.lastLineCount}A`);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      process.stdout.write(
        "\r\x1b[2K" + line.padEnd(ConsoleProgress.consoleWidth, " ")
      );
      if (i < lines.length - 1) {
        process.stdout.write("\n");
      }
    }

    this.lastLineCount = lines.length;
  }

  static stripFormat(text: string) {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  }

  static bar({
    ratio,
    filledChar = "█",
    emptyChar = "░",
    width,
  }: IBarConfig): string {
    const filledWidth = Math.floor(ratio * width);
    return (
      filledChar.repeat(filledWidth) + //
      emptyChar.repeat(width - filledWidth)
    );
  }

  private static calculateFlexWidth(
    line: string,
    indicator: string,
    maxWidth?: number
  ): number {
    const parts = line.split(indicator);
    const partsWidth = parts.reduce(
      (acc, part) => acc + this.stripFormat(part).length,
      0
    );
    const availableWidth = this.consoleWidth - partsWidth;
    return maxWidth ? Math.min(availableWidth, maxWidth) : availableWidth;
  }

  static flex({
    flex: text,
    emptyChar = " ",
    line,
    indicator = "{flex}",
    maxWidth,
    align = "start",
  }: IFlexConfig): string {
    const availableWidth = this.calculateFlexWidth(line, indicator, maxWidth);
    const textWidth = this.stripFormat(text).length;
    const emptyCount = Math.max(
      0,
      Math.floor((availableWidth - textWidth) / emptyChar.length)
    );
    const padding = emptyChar.repeat(emptyCount);
    const flexed = align === "end" ? padding + text : text + padding;
    return line.split(indicator).join(flexed);
  }

  static barFlex({
    ratio,
    filledChar,
    emptyChar,
    line,
    indicator = "{bar}",
    maxWidth,
  }: IBarFlexConfig): string {
    const barWidth = this.calculateFlexWidth(line, indicator, maxWidth);
    const bar = this.bar({ ratio, filledChar, emptyChar, width: barWidth });
    return line.split(indicator).join(bar);
  }

  stop() {
    if (!this.lastLineCount) return;
    console.log("\n");
    this.lastLineCount = 0;
  }
}
