export function runCli(
  args: string[],
  opts?: {
    cwd?: string;
    source?: string;
    emitUpdatePreview?: (text: string) => void;
    canConfirmUpdate?: boolean;
    confirmUpdate?: () => string | null;
  },
): { code: number; stdout: string; stderr: string };

export function terminalUpdateOptions(
  input?: { isTTY?: boolean; fd?: number },
  output?: { write(text: string): unknown },
): {
  canConfirmUpdate: boolean;
  emitUpdatePreview(text: string): void;
  confirmUpdate(): string | null;
};
