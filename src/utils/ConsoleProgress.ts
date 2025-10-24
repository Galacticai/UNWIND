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

  // static flex({});
  static barFlex({
    ratio,
    filledChar,
    emptyChar,
    line,
    indicator = "{bar}",
    maxWidth,
  }: IBarFlexConfig): string {
    const parts = line.split(indicator);
    const partsWidth = parts.reduce(
      //? ignore invisible formatting
      // eslint-disable-next-line no-control-regex
      (acc, part) => acc + part.replace(/\x1b\[[0-9;]*m/g, "").length,
      0
    );
    let barWidth = ConsoleProgress.consoleWidth - partsWidth;
    if (maxWidth) {
      barWidth = Math.min(barWidth, maxWidth);
    }

    const bar = ConsoleProgress.bar({
      ratio,
      filledChar,
      emptyChar,
      width: barWidth,
    });
    return parts.join(bar);
  }

  stop() {
    if (!this.lastLineCount) return;
    console.log("\n");
    this.lastLineCount = 0;
  }
}

export type IBarConfigBase = {
  /** value between 0 and 1 */
  ratio: number;
  /** default = `█` */
  filledChar?: string;
  /** default = `░` */
  emptyChar?: string;
};
export type IBarConfig = IBarConfigBase & {
  width: number;
};

export type IBarFlexConfig = IBarConfigBase & {
  /** line containing the bar indicator to be replaced with a bar */
  line: string;
  /**
   * key to indicate where to place a progress bar
   * default = `"{bar}"`
   */
  indicator?: string;
  /** default = flex width */
  maxWidth?: number;
};
