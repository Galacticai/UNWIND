/** {@link value} must be one of the {@link values} */
export const parseSelectionArg = <T extends string | number>(
  name: string, //
  value: T | undefined,
  ...values: T[]
) => {
  const commandIsValid = value && values.includes(value);
  if (commandIsValid) return true;

  throw new Error(
    `Unknown ${name}: '${value}'` + //
      `\n   Available ${name}s: '${values.join("', '")}'`
  );
};
