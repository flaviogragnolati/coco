param(
    [ValidateSet("auto", "python", "node")]
    [string]$Runtime = "auto",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonBackend = Join-Path $ScriptDir "python/spreadsheet_tool.py"
$NodeBackend = Join-Path $ScriptDir "node/spreadsheet-tool.mjs"

if ($Runtime -eq "auto" -and $env:SPREADSHEET_SKILL_RUNTIME) {
    $Runtime = $env:SPREADSHEET_SKILL_RUNTIME.ToLowerInvariant()
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PythonBackend([string]$Python, [string]$Command) {
    if ($Command -in @("doctor", "check", "--help")) { return $true }
    & $Python -c "import re, openpyxl; p=tuple(int(x) for x in re.findall(r'\d+', openpyxl.__version__)[:3]); p=p+(0,)*(3-len(p)); raise SystemExit(0 if (3,1,5) <= p < (4,0,0) else 1)" 2>$null
    return $LASTEXITCODE -eq 0
}

function Test-NodeBackend([string]$Node, [string]$Command) {
    if ($Command -in @("doctor", "check", "--help")) { return $true }
    try {
        $Doctor = & $Node $NodeBackend doctor --json 2>$null | ConvertFrom-Json
        return [bool]$Doctor.exceljs
    } catch {
        return $false
    }
}

$CommandName = if ($RemainingArgs.Count) { $RemainingArgs[0] } else { "--help" }
$Python = if ($env:SPREADSHEET_SKILL_PYTHON) { $env:SPREADSHEET_SKILL_PYTHON } elseif (Test-Command "python") { "python" } elseif (Test-Command "python3") { "python3" } else { $null }
$Node = if ($env:SPREADSHEET_SKILL_NODE) { $env:SPREADSHEET_SKILL_NODE } else { "node" }

if ($Runtime -eq "auto") {
    $Prefer = if ($env:SPREADSHEET_SKILL_PREFER) { $env:SPREADSHEET_SKILL_PREFER } else { "python" }
    if ($Prefer -eq "node" -and (Test-Command $Node) -and (Test-NodeBackend $Node $CommandName)) {
        $Runtime = "node"
    } elseif ($Python -and (Test-PythonBackend $Python $CommandName)) {
        $Runtime = "python"
    } elseif ((Test-Command $Node) -and (Test-NodeBackend $Node $CommandName)) {
        $Runtime = "node"
    } else {
        throw "No healthy Python or Node backend covers '$CommandName'."
    }
}

if ($CommandName -in @("recalculate", "render") -and -not (Test-Command "soffice") -and -not (Test-Command "libreoffice")) {
    throw "LibreOffice is required for '$CommandName'."
}

if ($Runtime -eq "python") {
    if (-not $Python -or -not (Test-PythonBackend $Python $CommandName)) { throw "Python backend lacks the required local package capability." }
    & $Python $PythonBackend @RemainingArgs
    exit $LASTEXITCODE
}

if (-not (Test-Command $Node) -or -not (Test-NodeBackend $Node $CommandName)) { throw "Node backend lacks the required local package capability." }
& $Node $NodeBackend @RemainingArgs
exit $LASTEXITCODE
