export function nodeVersionFinding(ver: string): { code: string; summary: string } | null;
export function foreignConfigFinding(
  cwd: string,
  source: string,
  cfg: { project_name?: string; wave?: string },
): { code: string; summary: string } | null;
export function runDoctor(
  cwd: string,
  source: string,
  nodeVer?: string,
): { code: number; stdout: string; stderr: string };
