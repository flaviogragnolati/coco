[CmdletBinding()]
param(
    [ValidateSet("auto", "python", "node")]
    [string]$Runtime = $(if ($env:PPTX_SKILL_RUNTIME) { $env:PPTX_SKILL_RUNTIME } else { "auto" }),
    [switch]$Json,
    [switch]$Quiet,
    [switch]$Overwrite,
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function Stop-PptxTool([string]$Message, [int]$Code) {
    [Console]::Error.WriteLine("Error: $Message")
    exit $Code
}
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonScript = Join-Path $ScriptDir "python/pptx_tool.py"
$NodeScript = Join-Path $ScriptDir "node/pptx-tool.mjs"
$NodeDir = Join-Path $ScriptDir "node"

if (-not $CommandArgs -or $CommandArgs.Count -eq 0) {
    $CommandArgs = @("--help")
}
$CommandName = "help"
foreach ($Token in $CommandArgs) {
    if ($Token -in @("--json", "--quiet", "--help", "-h")) { continue }
    if ($Token.StartsWith("-")) { continue }
    $CommandName = $Token
    break
}
if ($CommandName -eq "help" -and -not ($CommandArgs -contains "--help") -and -not ($CommandArgs -contains "-h")) {
    $CommandArgs += "--help"
}

function Test-CommandAvailable([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$PythonBin = $env:PPTX_SKILL_PYTHON
if (-not $PythonBin) {
    $VenvPython = Join-Path $ScriptDir "python/.venv/Scripts/python.exe"
    if (Test-Path $VenvPython) { $PythonBin = $VenvPython }
    elseif (Test-CommandAvailable "python") { $PythonBin = "python" }
    elseif (Test-CommandAvailable "python3") { $PythonBin = "python3" }
}

$NodeBin = $env:PPTX_SKILL_NODE
if (-not $NodeBin -and (Test-CommandAvailable "node")) { $NodeBin = "node" }

function Get-RuntimeFamily([string]$Candidate) {
    switch ($Candidate) {
        "python" { return "python" }
        "node" { return "node" }
    }
    return $null
}

function Test-RuntimeExecutable([string]$Candidate) {
    if ($Candidate -eq "python") { return [bool]$PythonBin }
    if ($Candidate -eq "node") { return [bool]$NodeBin }
    return $false
}

function Test-PythonModule([string]$Module) {
    if (-not $PythonBin) { return $false }
    & $PythonBin -c "import importlib.util,sys; raise SystemExit(0 if importlib.util.find_spec(sys.argv[1]) else 1)" $Module *> $null
    return ($LASTEXITCODE -eq 0)
}

function Test-NodePackage([string]$Package) {
    $Directory = $NodeDir
    while ($true) {
        if (Test-Path (Join-Path $Directory "node_modules/$Package")) { return $true }
        $Parent = Split-Path -Parent $Directory
        if (-not $Parent -or $Parent -eq $Directory) { break }
        $Directory = $Parent
    }
    return $false
}

function Test-RuntimeHealthy([string]$Candidate) {
    if (-not (Test-RuntimeExecutable $Candidate)) { return $false }
    if ($CommandName -in @("doctor", "help")) { return $true }

    $Family = Get-RuntimeFamily $Candidate
    if ($Family -eq "python") {
        switch ($CommandName) {
            "render" { return (Test-CommandAvailable "soffice") -and (Test-CommandAvailable "pdftoppm") }
            "contact-sheet" {
                return (Test-CommandAvailable "soffice") -and (Test-CommandAvailable "pdftoppm") -and (Test-PythonModule "PIL")
            }
            { $_ -in @("check", "extract-media") } { return $true }
            default { return (Test-PythonModule "pptx") }
        }
    }
    if ($Family -eq "node") {
        switch ($CommandName) {
            "render" { return (Test-CommandAvailable "soffice") -and (Test-CommandAvailable "pdftoppm") }
            "extract-media" { return (Test-NodePackage "jszip") }
            { $_ -in @("select", "replace-text", "contact-sheet") } { return $false }
            default { return (Test-NodePackage "jszip") -and (Test-NodePackage "fast-xml-parser") }
        }
    }
    return $false
}

$RequiredFamily = "any"
if ($CommandName -in @("select", "replace-text", "contact-sheet")) { $RequiredFamily = "python" }

function Test-OperationSupport([string]$Candidate) {
    switch ($RequiredFamily) {
        "any" { return $true }
        "python" { return ((Get-RuntimeFamily $Candidate) -eq "python") }
    }
    return $false
}

function Get-NearestProjectRuntime {
    $Directory = (Get-Location).Path
    while ($true) {
        foreach ($Marker in @("package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock")) {
            if (Test-Path (Join-Path $Directory $Marker)) { return "node" }
        }
        foreach ($Marker in @("pyproject.toml", "uv.lock", "requirements.txt", ".python-version")) {
            if (Test-Path (Join-Path $Directory $Marker)) { return "python" }
        }
        $Parent = Split-Path -Parent $Directory
        if (-not $Parent -or $Parent -eq $Directory) { break }
        $Directory = $Parent
    }
    return $null
}

$Selected = $null
if ($Runtime -ne "auto") {
    if (-not (Test-OperationSupport $Runtime)) {
        Stop-PptxTool "Runtime '$Runtime' does not cover command '$CommandName'." 5
    }
    if (-not (Test-RuntimeHealthy $Runtime)) {
        Stop-PptxTool "Runtime '$Runtime' or its PPTX dependencies are unavailable." 4
    }
    $Selected = $Runtime
}

if (-not $Selected) {
    $Candidates = [System.Collections.Generic.List[string]]::new()
    function Add-Candidate([string]$Candidate) {
        if ($Candidate -and -not $Candidates.Contains($Candidate)) { $Candidates.Add($Candidate) }
    }

    $Marker = Get-NearestProjectRuntime
    Add-Candidate $Marker
    if ($env:PPTX_SKILL_PREFER -eq "python") { Add-Candidate "python" }
    if ($env:PPTX_SKILL_PREFER -eq "node") { Add-Candidate "node" }
    $Order = if ($env:PPTX_SKILL_RUNTIME_ORDER) { $env:PPTX_SKILL_RUNTIME_ORDER } else { "python,node" }
    foreach ($Candidate in $Order.Split(",")) { Add-Candidate $Candidate.Trim().ToLowerInvariant() }

    foreach ($Candidate in $Candidates) {
        if (-not (Test-OperationSupport $Candidate)) {
            if ($env:PPTX_SKILL_NO_FALLBACK -eq "1" -and $Candidate -eq $Marker) {
                Stop-PptxTool "Preferred project runtime '$Candidate' does not cover '$CommandName' and fallback is disabled." 5
            }
            continue
        }
        if (Test-RuntimeHealthy $Candidate) {
            $Selected = $Candidate
            break
        }
        if ($env:PPTX_SKILL_NO_FALLBACK -eq "1" -and $Candidate -eq $Marker) {
            Stop-PptxTool "Preferred project runtime '$Candidate' is unavailable and fallback is disabled." 4
        }
    }
}

if (-not $Selected) { Stop-PptxTool "No healthy PPTX backend covers '$CommandName'." 4 }

$BackendArgs = @()
if ($Json) { $BackendArgs += "--json" }
if ($Quiet) { $BackendArgs += "--quiet" }
if ($Overwrite) { $BackendArgs += "--overwrite" }
$BackendArgs += $CommandArgs

$Family = Get-RuntimeFamily $Selected
if ($Family -eq "python") {
    $env:PPTX_SKILL_SELECTED_RUNTIME = "python"
    if (-not $Quiet) { [Console]::Error.WriteLine("q-tool-pptx runtime: python") }
    & $PythonBin $PythonScript @BackendArgs; exit $LASTEXITCODE
}

$env:PPTX_SKILL_SELECTED_RUNTIME = "node"
if (-not $Quiet) { [Console]::Error.WriteLine("q-tool-pptx runtime: node") }
& $NodeBin $NodeScript @BackendArgs; exit $LASTEXITCODE
