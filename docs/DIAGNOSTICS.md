# Verbose Diagnostics

Verbose Diagnostics adds factual, CodeGraphy-prefixed logs for support and agent debugging. It is off by default.

Diagnostic lines use this shape:

```text
[CodeGraphy][Diagnostics] <area> <event> <json context>
```

Example:

```text
[CodeGraphy][Diagnostics] extension.analysis request-started {"requestId":4,"mode":"load","filterPatternCount":2,"disabledPluginCount":0}
```

## VS Code Extension

Open Settings, expand **Performance**, and turn on **Verbose Diagnostics**.

The setting is saved in the current CodeGraphy Workspace:

```json
{
  "verboseDiagnostics": true
}
```

For support:

1. Enable **Verbose Diagnostics**.
2. Reload VS Code if startup logs are needed.
3. Open VS Code Developer Tools.
4. Reproduce the issue.
5. Copy `[CodeGraphy][Diagnostics]` console lines into the bug report.

The extension emits lifecycle, webview bootstrap, analysis request, and Graph Cache load-decision facts. Normal logging stays quiet when Verbose Diagnostics is off.

## CLI

Pass `--verbose` to any `codegraphy` command:

```bash
codegraphy --verbose status
codegraphy --verbose index /absolute/path/to/workspace
```

Verbose CLI diagnostics are written outside normal JSON stdout so command output remains parseable.

Example diagnostic line:

```text
[CodeGraphy][Diagnostics] cli command-started {"command":"status","workspacePath":"/absolute/path/to/workspace"}
```

## MCP

Every CodeGraphy MCP tool accepts `verboseDiagnostics`.

Example:

```json
{
  "path": "/absolute/path/to/workspace",
  "verboseDiagnostics": true
}
```

When enabled, the tool result includes a `diagnostics` array with factual Core Package events such as workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Default MCP responses are unchanged when `verboseDiagnostics` is omitted or false.
