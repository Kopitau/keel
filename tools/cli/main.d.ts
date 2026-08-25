export function runCli(
  args: string[],
  opts?: { cwd?: string; source?: string },
): { code: number; stdout: string; stderr: string };
