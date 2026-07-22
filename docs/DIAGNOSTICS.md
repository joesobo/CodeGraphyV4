# Verbose Diagnostics

Verbose Diagnostics adds factual, CodeGraphy-prefixed logs for support and agent debugging. It is off by default.

Diagnostic lines use this shape:

```text
[CodeGraphy] <event message>: <compact facts>
```

Example:

```text
[CodeGraphy] Starting analysis: request=4, mode=load, filters=2, disabledPlugins=0
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
5. Copy the relevant `[CodeGraphy]` console lines into the bug report.

The extension emits lifecycle, webview bootstrap, analysis request, and Graph Cache load-decision facts. Normal logging stays quiet when Verbose Diagnostics is off.

## CLI

Pass `--verbose` to any `codegraphy` command:

```bash
codegraphy --verbose status
codegraphy --verbose -C /absolute/path/to/workspace index
```

Verbose CLI diagnostics go to stderr so JSON stdout remains parseable.

Example diagnostic line:

```text
[CodeGraphy] Starting command: status, workspace=/absolute/path/to/workspace
```
