$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$runtime = (Get-Command node -ErrorAction Stop).Source
$major = [int]((& $runtime --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) {
    $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundled) { $runtime = $bundled }
    else { throw 'Install Node.js 24 LTS, then run npm ci and this script again.' }
}
if (-not (Test-Path 'node_modules/concurrently/dist/bin/concurrently.js')) {
    throw 'Dependencies are missing. Run npm ci first.'
}
$env:PATH = (Split-Path $runtime) + ';' + $env:PATH
& $runtime node_modules/concurrently/dist/bin/concurrently.js -k 'node --import tsx --watch server/index.ts' 'node node_modules/vite/bin/vite.js --host 0.0.0.0'
