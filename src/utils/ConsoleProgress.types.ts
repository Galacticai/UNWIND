type IBarConfigBase = {
  /** value between 0 and 1 */
  ratio: number;
  /** default = `█` */
  filledChar?: string;
  /** default = `░` */
  emptyChar?: string;
};

type IFlexConfigBase = {
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

export type IFlexConfig = IFlexConfigBase & {
  /** text to be flexed */
  flex: string;
  /**
   * char to fill in the empty flexed space
   * - default = space
   */
  emptyChar?: string;
  /**
   * alignment of text in flex space
   * - default = "start"
   */
  align?: "start" | "end";
};

export type IBarConfig = IBarConfigBase & {
  width: number;
};
export type IBarFlexConfig = IBarConfigBase & IFlexConfigBase;
