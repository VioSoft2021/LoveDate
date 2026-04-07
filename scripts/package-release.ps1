$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$distPath = Join-Path $projectRoot "dist"

if (-not (Test-Path $distPath)) {
  throw "dist folder not found. Run 'npm run build' first."
}

$packageJsonPath = Join-Path $projectRoot "package.json"
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$version = $package.version
if ([string]::IsNullOrWhiteSpace($version)) {
  $version = "0.0.0"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$releaseName = "lovedate-v$version-$timestamp"
$releasesRoot = Join-Path $projectRoot "releases"
$releaseDir = Join-Path $releasesRoot $releaseName
$zipPath = Join-Path $releasesRoot "$releaseName.zip"

New-Item -ItemType Directory -Path $releasesRoot -Force | Out-Null
if (Test-Path $releaseDir) {
  Remove-Item -LiteralPath $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item -Path $distPath -Destination (Join-Path $releaseDir "dist") -Recurse -Force

$envExample = Join-Path $projectRoot ".env.example"
if (Test-Path $envExample) {
  Copy-Item -Path $envExample -Destination (Join-Path $releaseDir ".env.example") -Force
}

$manifest = @"
LoveDate Release Package
========================

Version: $version
Built At: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Contents:
- dist/ (production web build)
- .env.example (environment template)

Quick Start:
1) Install a static file server (if needed): npm i -g serve
2) Run: serve dist
3) Open the local URL shown in terminal
"@

$manifestPath = Join-Path $releaseDir "RELEASE_NOTES.txt"
Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "Release package created:"
Write-Host "Folder: $releaseDir"
Write-Host "Zip:    $zipPath"
Write-Host ""
