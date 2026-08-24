/* Minimal Node builtin typings so tsc needs no @types/node (DEC-154 whitelist = typescript only). */

interface ImportMeta {
  url: string;
}

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(fd: number, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string, encoding: "utf8"): void;
  export function unlinkSync(path: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, opts?: { recursive?: boolean }): string | undefined;
  export function copyFileSync(src: string, dest: string): void;
  export function readdirSync(path: string, opts?: { recursive?: boolean }): string[];
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean; mtimeMs: number };
  export function rmSync(path: string, opts?: { recursive?: boolean; force?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function cpSync(
    src: string,
    dest: string,
    opts?: { recursive?: boolean; force?: boolean },
  ): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(p: string): string;
  export function resolve(...parts: string[]): string;
  export function basename(p: string, ext?: string): string;
  export function relative(from: string, to: string): string;
  export function isAbsolute(p: string): boolean;
  export const sep: string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare module "node:os" {
  export function tmpdir(): string;
  export function homedir(): string;
}

declare module "node:buffer" {
  export class Buffer {
    static from(data: Uint8Array | string, enc?: string): Buffer;
    toString(enc: "utf8"): string;
    byteLength: number;
  }
}

declare module "node:crypto" {
  export function createHash(alg: string): {
    update(data: string, encoding: "utf8"): { digest(enc: "hex"): string };
  };
}

declare module "node:process" {
  const process: {
    argv: string[];
    pid: number;
    platform: string;
    execPath: string;
    versions: { node: string };
    exitCode: number | undefined;
    env: { [key: string]: string | undefined };
    cwd(): string;
    exit(code?: number): never;
    stdout: { write(s: string): void };
    stderr: { write(s: string): void };
    stdin: { isTTY?: boolean };
  };
  export default process;
}

declare module "node:assert/strict" {
  const assert: {
    equal(a: unknown, b: unknown, msg?: string): void;
    deepEqual(a: unknown, b: unknown, msg?: string): void;
    ok(v: unknown, msg?: string): void;
    match(s: string, r: RegExp, msg?: string): void;
    doesNotMatch(s: string, r: RegExp, msg?: string): void;
  };
  export default assert;
}

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module "node:child_process" {
  export function spawnSync(
    cmd: string,
    args: string[],
    opts?: {
      encoding?: "utf8";
      cwd?: string;
      env?: { [k: string]: string | undefined };
      timeout?: number;
      shell?: boolean;
      maxBuffer?: number;
    },
  ): { status: number | null; stdout: string; stderr: string };
}
