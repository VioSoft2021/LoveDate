$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host ""
Write-Host "LoveDate desktop build pipeline"
Write-Host "=============================="
Write-Host "Project root: $projectRoot"
Write-Host ""

if (Test-Path "desktop-dist") {
  Remove-Item -LiteralPath "desktop-dist" -Recurse -Force
}

npm run build
npx electron-builder --win nsis portable

$artifacts = Get-ChildItem -Path "desktop-dist" -Recurse -File |
  Where-Object { $_.Extension -in ".exe", ".yml", ".blockmap" } |
  Select-Object FullName, Length, LastWriteTime

Write-Host ""
Write-Host "Artifacts generated:"
$artifacts | Format-Table -AutoSize
Write-Host ""
Write-Host "Done."
