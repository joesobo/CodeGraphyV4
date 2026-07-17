import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildArchitectureBoard,
  serializeArchitectureBoard,
} from "./architecture.command";

describe("CodeGraphy architecture board generator", () => {
  it("emits a tldraw v5-compatible .tldr document with unique records", () => {
    const board = buildArchitectureBoard();
    const ids = board.records.map((record) => record.id);

    expect(board.tldrawFileFormatVersion).toBe(1);
    expect(board.schema.schemaVersion).toBe(2);
    expect(new Set(ids).size).toBe(ids.length);
    expect(board.records.filter((record) => record.typeName === "shape").length).toBeGreaterThan(30);
  });

  it("captures the current product, Core, renderer, cache, and plugin boundaries", () => {
    const serialized = serializeArchitectureBoard();

    expect(serialized).toContain("VS Code extension host");
    expect(serialized).toContain("Core package");
    expect(serialized).toContain("Graph Query");
    expect(serialized).toContain("SQLite Graph Cache");
    expect(serialized).toContain("WebGPU drawing · WASM physics");
    expect(serialized).toContain("Plugin API");
    expect(serialized).toContain("PRODUCT SURFACES");
    expect(serialized).toContain("CAPABILITY PROVIDERS");
  });

  it("records the three load-bearing architecture decisions", () => {
    const serialized = serializeArchitectureBoard();

    expect(serialized).toContain("No MCP path");
    expect(serialized).toContain("SQLite persists snapshots");
    expect(serialized).toContain("TypeScript resolution stays in plugin analysis");
  });

  it("constrains annotation text to its assigned board width", () => {
    const textShapes = buildArchitectureBoard().records.filter(
      (record) => record.typeName === "shape" && record.type === "text",
    );

    expect(textShapes).not.toHaveLength(0);
    expect(
      textShapes.every((record) => {
        const props = record.props as { autoSize?: boolean };
        return props.autoSize === false;
      }),
    ).toBe(true);
  });

  it("runs as a repository script", () => {
    const require = createRequire(import.meta.url);
    const scriptPath = fileURLToPath(new URL("architecture.command.ts", import.meta.url));
    const result = spawnSync(process.execPath, [require.resolve("tsx/cli"), scriptPath], {
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Generated ");
    expect(result.stdout).toContain("boards/main.tldr");
  });
});
