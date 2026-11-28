# Install the Tangut schemas into Weasel (小狼毫, the Rime input method for Windows).
# Run install-windows.bat, or:  powershell -ExecutionPolicy Bypass -File install-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$schemas = @('tangut_downes', 'tangut_downes_reduced', 'tangut_ghc')

# Where Weasel is installed
$root = $null
foreach ($k in 'HKLM:\SOFTWARE\WOW6432Node\Rime\Weasel', 'HKLM:\SOFTWARE\Rime\Weasel') {
  $v = (Get-ItemProperty -Path $k -ErrorAction SilentlyContinue).WeaselRoot
  if ($v -and (Test-Path -LiteralPath $v)) { $root = $v; break }
}
if (-not $root) {
  $d = Get-ChildItem -Path "$env:ProgramFiles\Rime", "${env:ProgramFiles(x86)}\Rime" -Filter 'weasel-*' -Directory -ErrorAction SilentlyContinue |
       Sort-Object Name -Descending | Select-Object -First 1
  if ($d) { $root = $d.FullName }
}
if (-not $root) {
  Write-Host 'Weasel is not installed. Install it first from https://rime.im, then run this again.'
  Read-Host 'Press Enter to close'
  exit 1
}

# Rime user folder (Weasel may point it elsewhere in the registry)
$rime = (Get-ItemProperty -Path 'HKCU:\Software\Rime\Weasel' -ErrorAction SilentlyContinue).RimeUserDir
if (-not $rime) { $rime = Join-Path $env:APPDATA 'Rime' }
Write-Host "Copying schemas to $rime"
New-Item -ItemType Directory -Force -Path (Join-Path $rime 'lua') | Out-Null
Copy-Item -Path 'rime\*.yaml', 'rime\*.txt' -Destination $rime -Force
Copy-Item -Path 'rime\lua\*.lua' -Destination (Join-Path $rime 'lua') -Force

# Font, for the current user only (no administrator rights needed)
$fontDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
foreach ($f in Get-ChildItem -Path 'fonts\*.ttf' -ErrorAction SilentlyContinue) {
  New-Item -ItemType Directory -Force -Path $fontDir | Out-Null
  $dest = Join-Path $fontDir $f.Name
  try {
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    $name = [IO.Path]::GetFileNameWithoutExtension($f.Name) -replace '-Regular$', '' -creplace '([a-z])([A-Z])', '$1 $2'
    New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts' -Name "$name (TrueType)" `
      -Value $dest -PropertyType String -Force | Out-Null
    Write-Host "Installed font $($f.Name)"
  } catch {
    Write-Host "Font $($f.Name) is in use or already installed; skipped."
  }
}

# Add the schemas to the schema list in default.custom.yaml, keeping whatever is there.
$custom = Join-Path $rime 'default.custom.yaml'
function Items([string]$ind) { $schemas | ForEach-Object { "$ind- schema: $_" } }
if (-not (Test-Path -LiteralPath $custom)) {
  $out = @('patch:', '  "schema_list/+":') + (Items '    ')
  [IO.File]::WriteAllLines($custom, [string[]]$out, $utf8)
  Write-Host "Created $custom"
} else {
  $lines = [IO.File]::ReadAllLines($custom, $utf8)
  if (($lines -join "`n") -match 'tangut_downes') {
    Write-Host "$custom already lists the Tangut schemas"
  } else {
    Copy-Item -LiteralPath $custom -Destination "$custom.bak" -Force
    $out = New-Object System.Collections.Generic.List[string]
    $keyRe = '^\s*"?schema_list"?\s*:\s*(#.*)?$'
    if ($lines | Where-Object { $_ -match $keyRe }) {
      # append to the end of the existing block-style schema_list
      $state = 0; $base = ''; $ind = ''
      foreach ($l in $lines) {
        $li = ([regex]::Match($l, '^[ \t]*')).Value
        if ($state -eq 1) {
          if ($l -match '^\s*-\s') { $ind = $li; $state = 2; $out.Add($l); continue }
          if ($l -match '^\s*(#.*)?$') { $out.Add($l); continue }
          Items ($base + '  ') | ForEach-Object { $out.Add($_) }; $state = 3
        } elseif ($state -eq 2) {
          if (($l -match '^\s*(#.*)?$') -or ($li.Length -gt $ind.Length) -or (($l -match '^\s*-\s') -and ($li -eq $ind))) {
            $out.Add($l); continue
          }
          Items $ind | ForEach-Object { $out.Add($_) }; $state = 3
        }
        if (($state -eq 0) -and ($l -match $keyRe)) { $base = $li; $state = 1 }
        $out.Add($l)
      }
      if ($state -eq 2) { Items $ind | ForEach-Object { $out.Add($_) } }
      elseif ($state -eq 1) { Items ($base + '  ') | ForEach-Object { $out.Add($_) } }
    } elseif ($lines | Where-Object { $_ -match '^patch:' }) {
      $done = $false
      foreach ($l in $lines) {
        $out.Add($l)
        if (-not $done -and $l -match '^patch:') {
          $out.Add('  "schema_list/+":'); Items '    ' | ForEach-Object { $out.Add($_) }; $done = $true
        }
      }
    } else {
      $lines | ForEach-Object { $out.Add($_) }
      $out.Add('patch:'); $out.Add('  "schema_list/+":'); Items '    ' | ForEach-Object { $out.Add($_) }
    }
    [IO.File]::WriteAllLines($custom, [string[]]$out, $utf8)
    Write-Host "Added the Tangut schemas to $custom (old file kept as default.custom.yaml.bak)"
  }
}

Write-Host 'Deploying (this can take a minute the first time)...'
$deployer = Join-Path $root 'WeaselDeployer.exe'
if (Test-Path -LiteralPath $deployer) { Start-Process -FilePath $deployer -ArgumentList '/deploy' -Wait }
Write-Host ''
Write-Host 'Done. Switch to Weasel, press Ctrl+` (or F4) and choose 西夏 Downes, 西夏 Downes 寬 or 西夏 GHC.'
Write-Host 'If Tangut characters show as boxes in an application, restart that application.'
Read-Host 'Press Enter to close'
