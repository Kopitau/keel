# DEC-146: Windows launcher. Detects Node and refuses versions below 22.18.0 (DEC-150).
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "keel: node not found. Need Node >= 22.18.0 (DEC-150)."
    exit 1
}
$ver = & node -p "process.versions.node"
$code = & node -e "const c=process.versions.node.split('.').map(Number);const m=[22,18,0];for (let i=0;i<3;i++){if((c[i]||0)>(m[i]||0))process.exit(0);if((c[i]||0)<(m[i]||0))process.exit(2);}"
if ($LASTEXITCODE -ne 0) {
    Write-Error "keel: Node $ver is below 22.18.0 (DEC-150). Refusing to run."
    exit 1
}
& node (Join-Path $here "gate.ts") @args
exit $LASTEXITCODE
