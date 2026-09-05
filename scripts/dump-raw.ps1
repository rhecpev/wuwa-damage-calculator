# Dump any image (webp/jpg/png) as raw RGB bytes at a given size, for fast analysis in node.
# Usage: dump-raw.ps1 -In <file> -Out <file.raw> -W <w> -H <h> [-SrcX -SrcY -SrcW -SrcH]
param([string]$In,[string]$Out,[int]$W,[int]$H,[int]$SrcX=0,[int]$SrcY=0,[int]$SrcW=0,[int]$SrcH=0,[double]$TopFrac=0)
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore
$path = (Resolve-Path $In).Path
if ($path -match '\.webp$') {
  $fr = [System.Windows.Media.Imaging.BitmapDecoder]::Create((New-Object System.Uri $path),'None','OnLoad').Frames[0]
  $conv = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap $fr,([System.Windows.Media.PixelFormats]::Bgra32),$null,0
  $stride = $fr.PixelWidth*4
  $buf = New-Object byte[] ($stride*$fr.PixelHeight)
  $conv.CopyPixels($buf,$stride,0)
  $src = New-Object System.Drawing.Bitmap $fr.PixelWidth,$fr.PixelHeight,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bd = $src.LockBits((New-Object System.Drawing.Rectangle 0,0,$fr.PixelWidth,$fr.PixelHeight),[System.Drawing.Imaging.ImageLockMode]::WriteOnly,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  [System.Runtime.InteropServices.Marshal]::Copy($buf,0,$bd.Scan0,$buf.Length)
  $src.UnlockBits($bd)
} else { $src = New-Object System.Drawing.Bitmap $path }
if ($SrcW -le 0) { $SrcW = $src.Width }
if ($SrcH -le 0) { $SrcH = $src.Height }
if ($TopFrac -gt 0) { $SrcH = [int]($src.Height * $TopFrac) }
$dst = New-Object System.Drawing.Bitmap $W,$H,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
$g.DrawImage($src,(New-Object System.Drawing.Rectangle 0,0,$W,$H),$SrcX,$SrcY,$SrcW,$SrcH,[System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$bd = $dst.LockBits((New-Object System.Drawing.Rectangle 0,0,$W,$H),[System.Drawing.Imaging.ImageLockMode]::ReadOnly,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($W*$H*4)
[System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0,$bytes,0,$bytes.Length)
$dst.UnlockBits($bd)
[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) $Out),$bytes)
"$Out $W x $H (BGRA)"
$dst.Dispose(); $src.Dispose()
