export function ok(stdout) {
  return { code: 0, stdout: stdout, stderr: "" };
}

export function fail(stderr) {
  return { code: 1, stdout: "", stderr: stderr };
}
