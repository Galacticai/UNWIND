import { exec, ExecException } from "child_process";

export type ExecutionResult = {
  error?: ExecException;
  stdout: string;
  stderr: string;
};
export const execute = async (command: string) => {
  return new Promise<ExecutionResult>((resolve, reject) => {
    return exec(command, (error, stdout, stderr) => {
      if (error) reject({ error, stdout, stderr });
      else resolve({ stdout, stderr });
    });
  });
};
