param(
    [ValidateSet("auto", "python", "node")]
    [string]$Runtime = "auto",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonBackend = Join-Path $ScriptDir "python/document_tool.py"
$NodeBackend = Join-Path $ScriptDir "node/document-tool.mjs"

if ($Runtime -eq "auto" -and $env:DOCUMENT_SKILL_RUNTIME) {
    $Runtime = $env:DOCUMENT_SKILL_RUNTIME.ToLowerInvariant()
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

if ($Runtime -eq "auto") {
    if ($env:DOCUMENT_SKILL_PREFER -eq "node" -and (Test-Command "node")) {
        $Runtime = "node"
    } elseif (Test-Command "python") {
        $Runtime = "python"
    } elseif (Test-Command "python3") {
        $Runtime = "python"
    } elseif (Test-Command "node") {
        $Runtime = "node"
    } else {
        throw "No healthy Python or Node backend is available."
    }
}

if ($Runtime -eq "python") {
    $Python = if ($env:DOCUMENT_SKILL_PYTHON) { $env:DOCUMENT_SKILL_PYTHON } elseif (Test-Command "python") { "python" } else { "python3" }
    & $Python $PythonBackend @RemainingArgs
    exit $LASTEXITCODE
}

$Node = if ($env:DOCUMENT_SKILL_NODE) { $env:DOCUMENT_SKILL_NODE } else { "node" }
& $Node $NodeBackend @RemainingArgs
exit $LASTEXITCODE
