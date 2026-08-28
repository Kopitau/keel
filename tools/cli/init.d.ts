export type CleanInitOptions = {
  source: string;
  cwd: string;
  name?: string;
  tier?: string;
  humanName?: string;
  humanEmail?: string;
  platformsKeep?: boolean;
};

export function looksLikeLegacyFramework(cwd: string): string[];

export function buildCleanConfig(opts: CleanInitOptions): string;
