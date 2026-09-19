<#
    .SYNOPSIS
        PowerShell 7 helpers for image-cropper - init, clean, copy, deploy.

    .DESCRIPTION
        5 functions for the image-cropper tool. No fs-extra needed, pure PowerShell file ops (faster on Windows).

    .NOTES
        Requires PowerShell 7 (pwsh)
        Dot-source: . ./init-cropper.ps1
#>

function New-CropperInputTree {
    <#
        .SYNOPSIS
            Generates the input folder tree for the image-cropper tool.
    
        .DESCRIPTION
            Creates input/<service>/<profile>/ folders based on your cropper.config.mjs.
            This mirrors the structure expected by cropper.mjs (generic version).
            
            Supports two modes:
            - Service mode: input/<service>/<profile>/ -> dist/<service>/<profile>/
            - Flat mode:    input/<profile>/ -> dist/<profile>/
            
            The function can auto-parse SERVICES and PROFILES from your cropper.config.mjs,
            or you can pass them manually.
    
        .PARAMETER Services
            List of services/products. Example: box-lunch, canapes, coffee-break.
            These become subfolders under InputRoot.
            If not provided and FromConfig is used, it will be parsed from cropper.config.mjs.
            If neither is provided, flat mode is used.
    
        .PARAMETER Profiles
            List of profiles (ratio + widths). Example: hero_mobile, hero_desktop, menu_mobile.
            If not provided, it will be parsed from cropper.config.mjs or defaults to:
            cards_mobile, cards_desktop, hero_mobile, hero_desktop, menu_mobile, menu_desktop
    
        .PARAMETER InputRoot
            Root input folder. Default: ./input
            Parsed from INPUT_ROOT in config if available.
    
        .PARAMETER FromConfig
            Path to cropper.config.mjs to auto-parse SERVICES and PROFILES.
            Default: empty (uses manual params or defaults).
    
        .PARAMETER Flat
            Forces flat mode even if Services are provided.
            Creates input/<profile>/ instead of input/<service>/<profile>/.
    
        .PARAMETER WithReadme
            Creates a small README.md in each folder to explain what to put there.
    
        .EXAMPLE
            . ./init-cropper.ps1
            New-CropperInputTree -FromConfig ./cropper.config.mjs -WithReadme
    
            Reads SERVICES and PROFILES from your config and builds the whole tree.
    
        .EXAMPLE
            New-CropperInputTree -Services @("box-lunch","canapes","coffee-break","snack-cart","taquiza") -Profiles @("hero_mobile","hero_desktop","menu_mobile","menu_desktop","cards_mobile","cards_desktop") -WithReadme
    
            Manual creation for delisnack project.
    
        .EXAMPLE
            New-CropperInputTree -WhatIf
    
            Dry run - shows what would be created without creating it.
    
        .EXAMPLE
            New-CropperInputTree -Services @("box-lunch") -Profiles @("hero_desktop") -InputRoot ./my-input
    
            Creates only input/box-lunch/hero_desktop/ in a custom root.
    
        .NOTES
            Author: david-gmz / image-cropper
            Requires: PowerShell 7 (pwsh)
            Works with: cropper.mjs generic version that supports --service and --profile flags.
    
        .LINK
            https://github.com/david-gmz/image-cropper
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory=$false, HelpMessage="List of services, e.g. box-lunch, canapes")]
        [string[]]$Services,

        [Parameter(Mandatory=$false, HelpMessage="List of profiles, e.g. hero_mobile, hero_desktop")]
        [string[]]$Profiles,

        [Parameter(Mandatory=$false)]
        [string]$InputRoot = "./input",

        [Parameter(Mandatory=$false, HelpMessage="Path to cropper.config.mjs")]
        [string]$FromConfig = "",

        [Parameter(Mandatory=$false, HelpMessage="Force flat mode")]
        [switch]$Flat,

        [Parameter(Mandatory=$false)]
        [switch]$WithReadme
    )

    if ($FromConfig -and (Test-Path $FromConfig)) {
        $content = Get-Content $FromConfig -Raw
        if (-not $Services) {
            $match = [regex]::Match($content, 'SERVICES\s*=\s*\[(.*?)\]', 'Singleline')
            if ($match.Success) {
                $inner = $match.Groups[1].Value
                $Services = [regex]::Matches($inner, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
                if ($Services.Count -eq 0) {
                    $Services = [regex]::Matches($inner, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
                }
            }
        }
        if (-not $Profiles) {
            $match = [regex]::Match($content, 'PROFILES\s*=\s*\{(.*?)\n\};', 'Singleline')
            if ($match.Success) {
                $Profiles = [regex]::Matches($match.Value, '^\s*([a-zA-Z0-9_]+)\s*:\s*\{', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
            }
        }
        $m2 = [regex]::Match($content, 'INPUT_ROOT\s*=\s*["' + "'" + ']([^"' + "'" + ']+)["' + "'" + ']')
        if ($m2.Success) { $InputRoot = $m2.Groups[1].Value }
    }

    if (-not $Profiles) {
        $Profiles = @("cards_mobile","cards_desktop","hero_mobile","hero_desktop","menu_mobile","menu_desktop")
    }

    Write-Host "InputRoot: $InputRoot" -ForegroundColor Cyan
    if ($Services) { Write-Host "Services: $($Services -join ', ')" -ForegroundColor Cyan }
    else { Write-Host "Services: (flat mode)" -ForegroundColor Cyan }
    Write-Host "Profiles: $($Profiles -join ', ')" -ForegroundColor Cyan
    Write-Host ""

    $created = 0
    if ($Services -and -not $Flat) {
        foreach ($svc in $Services) {
            foreach ($prof in $Profiles) {
                $dir = Join-Path $InputRoot (Join-Path $svc $prof)
                if ($PSCmdlet.ShouldProcess($dir, "Create directory")) {
                    New-Item -ItemType Directory -Path $dir -Force | Out-Null
                    $created++
                    Write-Host "✓ $dir" -ForegroundColor Green
                    if ($WithReadme) {
                        $readme = Join-Path $dir "README.md"
                        if (-not (Test-Path $readme)) {
                            "# Put original images for $svc / $prof here`n# Ratio: defined in cropper.config.mjs`n# Output: dist/$svc/$prof/`n" | Set-Content $readme
                        }
                    }
                }
            }
        }
    } else {
        foreach ($prof in $Profiles) {
            $dir = Join-Path $InputRoot $prof
            if ($PSCmdlet.ShouldProcess($dir, "Create directory")) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                $created++
                Write-Host "✓ $dir" -ForegroundColor Green
            }
        }
    }

    Write-Host "`nCreated $created folders in $InputRoot" -ForegroundColor Yellow
    try {
        $rootPath = (Resolve-Path $InputRoot).Path
    Get-ChildItem $InputRoot -Recurse -Directory | ForEach-Object {
            $rel = $_.FullName.Replace($rootPath, "").TrimStart("\","/")
        if ($rel) { "📁 $rel" }
    }
    } catch {
        Write-Host "(Run again after creating $InputRoot to see tree)" -ForegroundColor DarkGray
    }
}

function Move-OldCropperInputs {
    <#
        .SYNOPSIS
            Migrates old flat input folders (input-mobile, etc) to new structure.
    
        .DESCRIPTION
            Moves files from legacy folders like input-mobile, input-desktop, input-hero
            into the new input/<service>/<profile>/ structure.
    
        .PARAMETER OldRoot
            Where old folders live. Default: .
    
        .PARAMETER NewRoot
            New input root. Default: ./input
    
        .PARAMETER DefaultService
            Service to assign old files to. Default: box-lunch
    
        .EXAMPLE
            Move-OldCropperInputs -OldRoot . -NewRoot ./input -DefaultService box-lunch -WhatIf
    
        .NOTES
            Useful when upgrading from v1 (mobile/desktop) to v2 (service/profile).
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [string]$OldRoot = ".",
        [string]$NewRoot = "./input",
        [string]$DefaultService = "box-lunch"
    )
    $map = @{
        "input-mobile" = "cards_mobile"
        "input-desktop" = "cards_desktop"
        "input-hero" = "hero_desktop"
        "input-menu" = "menu_mobile"
        "input-cards-mobile" = "cards_mobile"
        "input-cards-desktop" = "cards_desktop"
        "input-hero-mobile" = "hero_mobile"
        "input-hero-desktop" = "hero_desktop"
        "input-menu-mobile" = "menu_mobile"
        "input-menu-desktop" = "menu_desktop"
    }
    foreach ($kvp in $map.GetEnumerator()) {
        $old = Join-Path $OldRoot $kvp.Key
        if (Test-Path $old) {
            $new = Join-Path $NewRoot (Join-Path $DefaultService $kvp.Value)
            if ($PSCmdlet.ShouldProcess("$old -> $new", "Move files")) {
                New-Item -ItemType Directory -Path $new -Force | Out-Null
                $files = Get-ChildItem $old -File
                if ($files) {
                    $files | Move-Item -Destination $new -Force
                    Write-Host "→ Moved $($kvp.Key) ($($files.Count) files) -> $DefaultService/$($kvp.Value)" -ForegroundColor Green
                }
            }
        }
    }
}

# Auto-run when script is executed directly, not dot-sourced
if ($MyInvocation.InvocationName -ne '.') {
    $configPath = "./cropper.config.mjs"
    if (Test-Path $configPath) {
        Write-Host "Found $configPath, building tree..." -ForegroundColor Yellow
        New-CropperInputTree -FromConfig $configPath -WithReadme
    } else {
        Write-Host "No cropper.config.mjs found. Creating generic tree..." -ForegroundColor Yellow
        New-CropperInputTree -WithReadme
    }
}

function Clear-CropperDist {
    <#
        .SYNOPSIS
            Cleans the dist folder (cross-platform).

        .DESCRIPTION
            Empties ./dist but keeps the folder. Uses fs-extra equivalent in PowerShell.

        .EXAMPLE
            Clear-CropperDist
            Clear-CropperDist -WhatIf
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([string]$Dist = "./dist")
    if (Test-Path $Dist) {
        if ($PSCmdlet.ShouldProcess($Dist, "Empty dist folder")) {
            Get-ChildItem $Dist -Recurse -Force | Remove-Item -Force -Recurse
            Write-Host "✓ Cleaned $Dist" -ForegroundColor Green
        }
    } else {
        Write-Host "ℹ $Dist does not exist" -ForegroundColor Yellow
    }
}

function Copy-CropperDist {
    <#
        .SYNOPSIS
            Copies dist to Laragon/public (or any dest), supports single or multiple services.

        .DESCRIPTION
            Replaces all those pnpm run copy:box-lunch, copy:coffee-break scripts.
            One function, any service.

            By default copies everything: dist/ -> C:/laragon/www/delisnack/public/assets/images/services

        .PARAMETER Services
            One or more services to copy. If empty, copies whole dist.
            Example: @("box-lunch") or @("box-lunch","canapes")

        .PARAMETER DestRoot
            Destination root. Default from env DEST or C:/laragon/www/delisnack/public/assets/images/services

        .PARAMETER DistRoot
            Source dist root. Default ./dist

        .EXAMPLE
            Copy-CropperDist
            Copy-CropperDist -Services box-lunch
            Copy-CropperDist -Services @("box-lunch","canapes","coffee-break")
            Copy-CropperDist -Services coffee-break -DestRoot "C:/laragon/www/delisnack/public/assets/images/services"

        .EXAMPLE
            # override dest via env
            $env:DEST="C:/other/project/public/images"
            Copy-CropperDist -Services box-lunch
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [string[]]$Services,
        [string]$DestRoot = $env:DEST,
        [string]$DistRoot = "./dist"
    )
    if (-not $DestRoot) {
        $DestRoot = "C:/laragon/www/delisnack/public/assets/images/services"
    }

    if (-not (Test-Path $DistRoot)) {
        Write-Host "⚠ $DistRoot does not exist, run crop first" -ForegroundColor Red
        return
    }

    if (-not $Services -or $Services.Count -eq 0) {
        # copy all
        $dest = $DestRoot
        if ($PSCmdlet.ShouldProcess("$DistRoot -> $dest", "Copy all")) {
            New-Item -ItemType Directory -Path $dest -Force | Out-Null
            Copy-Item -Path "$DistRoot/*" -Destination $dest -Recurse -Force
            Write-Host "✓ Copied $DistRoot -> $dest" -ForegroundColor Green
        }
    } else {
        foreach ($svc in $Services) {
            $src = Join-Path $DistRoot $svc
            if (-not (Test-Path $src)) {
                Write-Host "⚠ $src not found, skipping $svc" -ForegroundColor Yellow
                continue
            }
            $dest = Join-Path $DestRoot $svc
            if ($PSCmdlet.ShouldProcess("$src -> $dest", "Copy $svc")) {
                New-Item -ItemType Directory -Path $dest -Force | Out-Null
                Copy-Item -Path "$src/*" -Destination $dest -Recurse -Force
                Write-Host "✓ Copied $src -> $dest" -ForegroundColor Green
            }
        }
    }
}

function Deploy-Cropper {
    <#
        .SYNOPSIS
            Deploys: crops then copies, in one command.

        .DESCRIPTION
            Replaces pnpm run deploy and deploy:box-lunch.
            You can pass any service list and it will crop + copy only those.

        .PARAMETER Services
            Services to crop & copy. Default: all

        .PARAMETER Config
            Config file. Default: cropper.config.delisnack.mjs

        .PARAMETER Profiles
            Optional profile filter.

        .EXAMPLE
            Deploy-Cropper -Services box-lunch
            Deploy-Cropper -Services @("box-lunch","canapes") -Profiles @("hero_desktop")
            Deploy-Cropper -Services all
    #>
    [CmdletBinding()]
    param(
        [string[]]$Services = @("all"),
        [string[]]$Profiles,
        [string]$Config = "cropper.config.delisnack.mjs",
        [string]$DestRoot = $env:DEST
    )
    $svcArg = ($Services -join ",")
    $profileArg = if ($Profiles) { "--profile=$($Profiles -join ',')" } else { "" }
    $cmd = "node cropper.mjs --config=$Config --service=$svcArg --manifest $profileArg".Trim()
    Write-Host "→ $cmd" -ForegroundColor Cyan
    Invoke-Expression $cmd
    if ($LASTEXITCODE -eq 0) {
        if ($Services -contains "all" -or $Services.Count -eq 0) {
            Copy-CropperDist -DestRoot $DestRoot
        } else {
            Copy-CropperDist -Services $Services -DestRoot $DestRoot
        }
    } else {
        Write-Host "⚠ Crop failed, not copying" -ForegroundColor Red
    }
}
