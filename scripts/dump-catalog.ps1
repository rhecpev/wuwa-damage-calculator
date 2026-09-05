# Turn the downloaded catalog artwork into raw RGBA dumps that
# scripts/build-icon-signatures.mjs can read. Windows only: webp decoding
# rides on WIC, which is why this step is PowerShell and not node.
# ASCII only - PowerShell 5.1 reads script files as ANSI.
$ErrorActionPreference = "Stop"
foreach ($d in "tmp\raw\echo","tmp\raw\fetter","tmp\raw\char") { New-Item -ItemType Directory -Force $d | Out-Null }

$n = 0
foreach ($f in Get-ChildItem "tmp\icons\*.webp") {
  $o = "tmp\raw\echo\" + $f.BaseName + ".raw"
  if (-not (Test-Path $o)) { & .\scripts\dump-raw.ps1 -In $f.FullName -Out $o -W 64 -H 64 | Out-Null }
  $n++
}
"echo: $n"

$n = 0
foreach ($f in Get-ChildItem "tmp\fetters\*.webp") {
  $o = "tmp\raw\fetter\" + $f.BaseName + ".raw"
  if (-not (Test-Path $o)) { & .\scripts\dump-raw.ps1 -In $f.FullName -Out $o -W 64 -H 64 | Out-Null }
  $n++
}
"fetter: $n"

# Character pile art: only the top 78% is usable - the rest is covered by the
# resonance-chain stars and the echo cards on the profile card.
$n = 0
foreach ($f in Get-ChildItem "tmp\piles\*.webp") {
  $o = "tmp\raw\char\" + $f.BaseName + ".raw"
  if (-not (Test-Path $o)) { & .\scripts\dump-raw.ps1 -In $f.FullName -Out $o -W 174 -H 187 -TopFrac 0.78 | Out-Null }
  $n++
}
"char: $n"
