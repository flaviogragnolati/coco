[CmdletBinding()]
param(
    [ValidateSet("auto", "python", "node")]
    [string]$Runtime = $(if ($env:PDF_SKILL_RUNTIME) { $env:PDF_SKILL_RUNTIME } else { "auto" }),
    [switch]$Json,
    [switch]$Quiet,
    [switch]$Overwrite,
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function Stop-PdfTool([string]$Message, [int]$Code) {
    [Console]::Error.WriteLine("Error: $Message")
    exit $Code
}
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonScript = Join-Path $ScriptDir "python/pdf_tool.py"
$NodeScript = Join-Path $ScriptDir "node/pdf-tool.mjs"
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

function Test-Option([string]$Name) {
    foreach ($Token in $CommandArgs) {
        if ($Token -eq $Name -or $Token.StartsWith("$Name=")) { return $true }
    }
    return $false
}

$PythonBin = $env:PDF_SKILL_PYTHON
if (-not $PythonBin) {
    $VenvPython = Join-Path $ScriptDir "python/.venv/Scripts/python.exe"
    if (Test-Path $VenvPython) { $PythonBin = $VenvPython }
    elseif (Test-CommandAvailable "python") { $PythonBin = "python" }
    elseif (Test-CommandAvailable "python3") { $PythonBin = "python3" }
}

function Test-RuntimeExecutable([string]$Candidate) {
    switch ($Candidate) {
        "python" { return [bool]$PythonBin }
        "node" { return (Test-CommandAvailable $(if ($env:PDF_SKILL_NODE) { $env:PDF_SKILL_NODE } else { "node" })) }
        default { return $false }
    }
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

    if ($Candidate -eq "python") {
        switch ($CommandName) {
            "extract-tables" { return (Test-PythonModule "pdfplumber") }
            "extract-images" { return (Test-CommandAvailable "pdfimages") -and (Test-PythonModule "pypdf") }
            "check" { return (Test-CommandAvailable "qpdf") -or (Test-PythonModule "pypdf") }
            { $_ -in @("repair", "linearize", "decrypt", "encrypt") } {
                return (Test-CommandAvailable "qpdf") -and (Test-PythonModule "pypdf")
            }
            "ocr" { return (Test-CommandAvailable "ocrmypdf") -and (Test-PythonModule "pypdf") }
            "render" {
                return (Test-PythonModule "pypdf") -and
                       ((Test-PythonModule "pypdfium2") -or (Test-CommandAvailable "pdftoppm"))
            }
            default { return (Test-PythonModule "pypdf") }
        }
    }

    if ($Candidate -eq "node") {
        switch ($CommandName) {
            "inspect" { return (Test-NodePackage "pdf-lib") -and (Test-NodePackage "pdfjs-dist") }
            "extract-text" { return (Test-NodePackage "pdfjs-dist") }
            { $_ -in @("merge", "select", "split", "rotate", "crop", "watermark", "form-list") } {
                return (Test-NodePackage "pdf-lib")
            }
            "form-fill" {
                return (Test-NodePackage "pdf-lib") -and
                       ((-not (Test-Option "--font")) -or (Test-NodePackage "@pdf-lib/fontkit"))
            }
            "render" { return (Test-NodePackage "pdfjs-dist") -and (Test-CommandAvailable "pdftoppm") }
            "extract-images" { return (Test-CommandAvailable "pdfimages") }
            "check" {
                return (Test-CommandAvailable "qpdf") -or
                       ((Test-NodePackage "pdf-lib") -and (Test-NodePackage "pdfjs-dist"))
            }
            { $_ -in @("repair", "linearize", "decrypt", "encrypt") } { return (Test-CommandAvailable "qpdf") }
            "ocr" { return (Test-CommandAvailable "ocrmypdf") }
            "extract-tables" { return $false }
            default { return (Test-NodePackage "pdf-lib") -and (Test-NodePackage "pdfjs-dist") }
        }
    }
    return $false
}

$RequiredFamily = "any"
if ($CommandName -eq "extract-tables") { $RequiredFamily = "python" }
if ($CommandName -eq "watermark" -and (Test-Option "--underlay")) { $RequiredFamily = "python" }
if ($CommandName -eq "form-fill" -and (Test-Option "--font")) { $RequiredFamily = "node" }

function Test-OperationSupport([string]$Candidate) {
    switch ($RequiredFamily) {
        "any" { return $true }
        "python" { return ($Candidate -eq "python") }
        "node" { return ($Candidate -eq "node") }
    }
    return $false
}

function Get-NearestProjectRuntime {
    $Directory = (Get-Location).Path
    while ($true) {
        if ((Test-Path (Join-Path $Directory "package.json")) -or (Test-Path (Join-Path $Directory "package-lock.json")) -or (Test-Path (Join-Path $Directory "pnpm-lock.yaml")) -or (Test-Path (Join-Path $Directory "yarn.lock"))) { return "node" }
        if ((Test-Path (Join-Path $Directory "pyproject.toml")) -or (Test-Path (Join-Path $Directory "uv.lock")) -or (Test-Path (Join-Path $Directory "requirements.txt")) -or (Test-Path (Join-Path $Directory ".python-version"))) { return "python" }
        $Parent = Split-Path -Parent $Directory
        if (-not $Parent -or $Parent -eq $Directory) { break }
        $Directory = $Parent
    }
    return $null
}

$Selected = $null
if ($Runtime -ne "auto") {
    if (-not (Test-OperationSupport $Runtime)) {
        Stop-PdfTool "Runtime '$Runtime' does not cover command '$CommandName'." 5
    }
    if (-not (Test-RuntimeHealthy $Runtime)) {
        Stop-PdfTool "Runtime '$Runtime' or its PDF dependencies are unavailable." 4
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
    if ($env:PDF_SKILL_PREFER -eq "python") { Add-Candidate "python" }
    if ($env:PDF_SKILL_PREFER -eq "node") {
        Add-Candidate "node"
    }
    $Order = if ($env:PDF_SKILL_RUNTIME_ORDER) { $env:PDF_SKILL_RUNTIME_ORDER } else { "python,node" }
    foreach ($Candidate in $Order.Split(",")) { Add-Candidate $Candidate.Trim().ToLowerInvariant() }

    foreach ($Candidate in $Candidates) {
        if (-not (Test-OperationSupport $Candidate)) {
            if ($env:PDF_SKILL_NO_FALLBACK -eq "1" -and $Candidate -eq $Marker) {
                Stop-PdfTool "Preferred project runtime '$Candidate' does not cover '$CommandName' and fallback is disabled." 5
            }
            continue
        }
        if (Test-RuntimeHealthy $Candidate) {
            $Selected = $Candidate
            break
        }
        if ($env:PDF_SKILL_NO_FALLBACK -eq "1" -and $Candidate -eq $Marker) {
            Stop-PdfTool "Preferred project runtime '$Candidate' is unavailable and fallback is disabled." 4
        }
    }
}

if (-not $Selected) { Stop-PdfTool "No healthy PDF backend covers '$CommandName'." 4 }
$env:PDF_SKILL_SELECTED_RUNTIME = $Selected
if (-not $Quiet) { [Console]::Error.WriteLine("q-tool-pdf runtime: $Selected") }

$BackendArgs = @()
if ($Json) { $BackendArgs += "--json" }
if ($Quiet) { $BackendArgs += "--quiet" }
if ($Overwrite) { $BackendArgs += "--overwrite" }
$BackendArgs += $CommandArgs

switch ($Selected) {
    "python" { & $PythonBin $PythonScript @BackendArgs; exit $LASTEXITCODE }
    "node" {
        $Exe = if ($env:PDF_SKILL_NODE) { $env:PDF_SKILL_NODE } else { "node" }
        & $Exe $NodeScript @BackendArgs; exit $LASTEXITCODE
    }
}
