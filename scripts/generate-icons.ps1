# Generates PNG icons for AmazonHunt using .NET System.Drawing

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$iconsDir = Join-Path $Root "icons"
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

function New-Icon {
  param([int]$Size, [string]$BgColor, [string]$AccentColor, [string]$OutputPath)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Dark background rounded square
  $bg = [System.Drawing.ColorTranslator]::FromHtml($BgColor)
  $accent = [System.Drawing.ColorTranslator]::FromHtml($AccentColor)
  $bgBrush = New-Object System.Drawing.SolidBrush($bg)
  $r = [Math]::Max(2, [Math]::Round($Size * 0.22))
  $g.FillEllipse($bgBrush, 0, 0, $Size-1, $Size-1)

  # Magnifier circle
  $mPen = New-Object System.Drawing.Pen($accent, [Math]::Max(1, $Size * 0.12))
  $mPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $cx = $Size * 0.38; $cy = $Size * 0.38; $cr = $Size * 0.22
  $g.DrawEllipse($mPen, $cx - $cr, $cy - $cr, $cr*2, $cr*2)

  # Handle
  $hPen = New-Object System.Drawing.Pen($accent, [Math]::Max(1, $Size * 0.13))
  $hPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $hPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($hPen, $cx + $cr * 0.7, $cy + $cr * 0.7, $Size * 0.82, $Size * 0.82)

  # Amazon smile arc (bottom)
  $aPen = New-Object System.Drawing.Pen($accent, [Math]::Max(1, $Size * 0.09))
  $aPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $aPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arcLeft = $Size * 0.15; $arcTop = $Size * 0.55
  $arcW = $Size * 0.5; $arcH = $Size * 0.3
  $g.DrawArc($aPen, $arcLeft, $arcTop, $arcW, $arcH, 10, 160)

  $g.Dispose()
  $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  icon${Size}.png"
}

Write-Host "Generating AmazonHunt icons..."
foreach ($size in @(16, 32, 48, 128)) {
  New-Icon -Size $size -BgColor "#232F3E" -AccentColor "#FF9900" -OutputPath (Join-Path $iconsDir "icon$size.png")
}
Write-Host "Done."
