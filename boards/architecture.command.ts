import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface TldrawSchema {
  schemaVersion: number;
  sequences: Record<string, number>;
}

export interface TldrawRecord {
  id: string;
  typeName: string;
  [key: string]: unknown;
}

export interface TldrawFile {
  tldrawFileFormatVersion: number;
  schema: TldrawSchema;
  records: TldrawRecord[];
}

interface ShapeOptions {
  align?: string;
  color?: string;
  dash?: string;
  fill?: string;
  geo?: string;
  labelColor?: string;
  opacity?: number;
  size?: string;
  verticalAlign?: string;
}

interface TextOptions {
  color?: string;
  opacity?: number;
  size?: string;
  textAlign?: string;
}

interface ArrowOptions {
  arrowheadEnd?: string;
  arrowheadStart?: string;
  bend?: number;
  color?: string;
  dash?: string;
  labelColor?: string;
  labelPosition?: number;
  opacity?: number;
  size?: string;
}

interface RichTextNode {
  type: string;
  attrs?: { dir: string };
  content?: RichTextNode[];
  text?: string;
}

const tldrawSchema: TldrawSchema = {
  schemaVersion: 2,
  sequences: {
    "com.tldraw.store": 5,
    "com.tldraw.asset": 1,
    "com.tldraw.camera": 1,
    "com.tldraw.document": 2,
    "com.tldraw.instance": 26,
    "com.tldraw.instance_page_state": 5,
    "com.tldraw.page": 1,
    "com.tldraw.instance_presence": 6,
    "com.tldraw.pointer": 1,
    "com.tldraw.shape": 4,
    "com.tldraw.user": 1,
    "com.tldraw.asset.image": 6,
    "com.tldraw.asset.video": 5,
    "com.tldraw.asset.bookmark": 2,
    "com.tldraw.shape.group": 0,
    "com.tldraw.shape.text": 4,
    "com.tldraw.shape.bookmark": 2,
    "com.tldraw.shape.draw": 5,
    "com.tldraw.shape.geo": 11,
    "com.tldraw.shape.note": 13,
    "com.tldraw.shape.line": 5,
    "com.tldraw.shape.frame": 1,
    "com.tldraw.shape.arrow": 8,
    "com.tldraw.shape.highlight": 4,
    "com.tldraw.shape.embed": 4,
    "com.tldraw.shape.image": 5,
    "com.tldraw.shape.video": 4,
    "com.tldraw.binding.arrow": 1,
  },
};

const indexCharacters = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const architecturePages = [
  { key: "overview", name: "01 System overview" },
  { key: "indexing", name: "02 Indexing and query" },
  { key: "runtime", name: "03 VS Code runtime" },
  { key: "plugins", name: "04 Plugin system" },
] as const;

type ArchitecturePageKey = (typeof architecturePages)[number]["key"];

function architecturePageId(key: ArchitecturePageKey): string {
  return "page:" + key;
}

function createRichText(value: string): RichTextNode {
  const lines = value === "" ? [""] : value.split("\n");
  return {
    type: "doc",
    attrs: { dir: "auto" },
    content: lines.map((line) => ({
      type: "paragraph",
      attrs: { dir: "auto" },
      ...(line === ""
        ? {}
        : {
            content: [
              {
                type: "text",
                text: line,
              },
            ],
          }),
    })),
  };
}

function createBaseRecords(): TldrawRecord[] {
  const pageRecords = architecturePages.flatMap<TldrawRecord>(({ key, name }, pageIndex) => {
    const pageId = architecturePageId(key);
    return [
      {
        x: 20,
        y: 20,
        z: 0.7,
        meta: {},
        id: "camera:" + pageId,
        typeName: "camera",
      },
      {
        editingShapeId: null,
        croppingShapeId: null,
        selectedShapeIds: [],
        hoveredShapeId: null,
        erasingShapeIds: [],
        hintingShapeIds: [],
        focusedGroupId: null,
        meta: {},
        id: "instance_page_state:" + pageId,
        pageId,
        typeName: "instance_page_state",
      },
      {
        meta: {},
        id: pageId,
        name,
        index: "a" + String(pageIndex + 1),
        typeName: "page",
      },
    ];
  });

  return [
    {
      x: 0,
      y: 0,
      lastActivityTimestamp: 0,
      meta: {},
      id: "pointer:pointer",
      typeName: "pointer",
    },
    ...pageRecords,
    {
      gridSize: 10,
      name: "CodeGraphy architecture",
      meta: {},
      id: "document:document",
      typeName: "document",
    },
    {
      followingUserId: null,
      opacityForNextShape: 1,
      stylesForNextShape: { "tldraw:geo": "rectangle" },
      brush: null,
      scribbles: [],
      cursor: { type: "default", rotation: 0 },
      isFocusMode: false,
      exportBackground: true,
      isDebugMode: false,
      isToolLocked: false,
      screenBounds: { x: 0, y: 0, w: 1440, h: 900 },
      insets: [false, false, false, false],
      zoomBrush: null,
      isGridMode: false,
      isPenMode: false,
      chatMessage: "",
      isChatting: false,
      highlightedUserIds: [],
      isFocused: true,
      devicePixelRatio: 1,
      isCoarsePointer: false,
      isHoveringCanvas: false,
      openMenus: [],
      isChangingStyle: false,
      isReadonly: false,
      meta: {},
      duplicateProps: null,
      cameraState: "idle",
      id: "instance:instance",
      currentPageId: architecturePageId("overview"),
      typeName: "instance",
    },
    {
      name: "CodeGraphy",
      color: "#64748B",
      imageUrl: "",
      meta: {},
      id: "user:codegraphy",
      typeName: "user",
    },
  ];
}

export function buildArchitectureBoard(): TldrawFile {
  const records: TldrawRecord[] = [];
  let activePageKey: ArchitecturePageKey = "overview";
  const indexCursorByPage = new Map<ArchitecturePageKey, number>();

  function beginPage(key: ArchitecturePageKey): void {
    activePageKey = key;
  }

  function nextIndex(): string {
    const indexCursor = indexCursorByPage.get(activePageKey) ?? 0;
    const character = indexCharacters[indexCursor];
    if (character === undefined) {
      throw new Error("The architecture board has more shapes than its index sequence supports.");
    }
    indexCursorByPage.set(activePageKey, indexCursor + 1);
    return "a" + character;
  }

  function addGeo(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    options: ShapeOptions = {},
  ): void {
    records.push({
      x,
      y,
      rotation: 0,
      isLocked: false,
      opacity: options.opacity ?? 1,
      meta: {},
      id: "shape:" + activePageKey + ":" + id,
      type: "geo",
      props: {
        w: width,
        h: height,
        geo: options.geo ?? "rectangle",
        dash: options.dash ?? "solid",
        growY: 0,
        url: "",
        scale: 1,
        color: options.color ?? "grey",
        labelColor: options.labelColor ?? "black",
        fill: options.fill ?? "semi",
        size: options.size ?? "m",
        font: "sans",
        align: options.align ?? "middle",
        verticalAlign: options.verticalAlign ?? "middle",
        richText: createRichText(label),
      },
      parentId: architecturePageId(activePageKey),
      index: nextIndex(),
      typeName: "shape",
    });
  }

  function addText(
    id: string,
    x: number,
    y: number,
    width: number,
    label: string,
    options: TextOptions = {},
  ): void {
    records.push({
      x,
      y,
      rotation: 0,
      isLocked: false,
      opacity: options.opacity ?? 1,
      meta: {},
      id: "shape:" + activePageKey + ":" + id,
      type: "text",
      props: {
        color: options.color ?? "black",
        size: options.size ?? "m",
        w: width,
        font: "sans",
        textAlign: options.textAlign ?? "start",
        autoSize: false,
        scale: 1,
        richText: createRichText(label),
      },
      parentId: architecturePageId(activePageKey),
      index: nextIndex(),
      typeName: "shape",
    });
  }

  function addArrow(
    id: string,
    x: number,
    y: number,
    endX: number,
    endY: number,
    label = "",
    options: ArrowOptions = {},
  ): void {
    records.push({
      x,
      y,
      rotation: 0,
      isLocked: false,
      opacity: options.opacity ?? 1,
      meta: {},
      id: "shape:" + activePageKey + ":" + id,
      type: "arrow",
      props: {
        kind: "arc",
        elbowMidPoint: 0.5,
        dash: options.dash ?? "solid",
        size: options.size ?? "s",
        fill: "none",
        color: options.color ?? "grey",
        labelColor: options.labelColor ?? "grey",
        bend: options.bend ?? 0,
        start: { x: 0, y: 0 },
        end: { x: endX - x, y: endY - y },
        arrowheadStart: options.arrowheadStart ?? "none",
        arrowheadEnd: options.arrowheadEnd ?? "arrow",
        richText: createRichText(label),
        labelPosition: options.labelPosition ?? 0.5,
        font: "sans",
        scale: 1,
      },
      parentId: architecturePageId(activePageKey),
      index: nextIndex(),
      typeName: "shape",
    });
  }

  beginPage("overview");

  // Quiet lane surfaces establish the reading order without a full-page grid.
  addGeo("surface-lane", 80, 245, 1440, 200, "", {
    color: "light-blue",
    fill: "solid",
    opacity: 0.12,
  });
  addGeo("core-lane", 80, 500, 1440, 285, "", {
    color: "light-green",
    fill: "solid",
    opacity: 0.12,
  });
  addGeo("provider-lane", 80, 790, 1440, 180, "", {
    color: "orange",
    fill: "solid",
    opacity: 0.1,
  });

  // Connectors render below modules and stay within their own architectural stratum.
  addArrow("vscode-to-host", 330, 345, 400, 345);
  addArrow("host-to-webview", 670, 345, 740, 345);
  addArrow("agent-to-cli", 1230, 345, 1290, 345);
  addArrow("settings-to-discovery", 300, 680, 350, 680);
  addArrow("discovery-to-analysis", 540, 680, 590, 680);
  addArrow("analysis-to-projection", 800, 680, 850, 680);
  addArrow("projection-to-memory", 1040, 680, 1090, 680);
  addArrow("memory-to-query", 1280, 680, 1330, 680);
  addArrow("projection-to-cache", 945, 720, 1070, 755, "", { bend: 16 });

  addGeo("atlas-label", 80, 45, 390, 48, "CODEGRAPHY / ARCHITECTURE ATLAS", {
    color: "black",
    fill: "solid",
    labelColor: "white",
    size: "s",
  });
  addText("page-number", 1390, 56, 130, "01", {
    color: "grey",
    size: "xl",
    textAlign: "end",
  });
  addText("title", 80, 112, 820, "System overview", { size: "xl" });
  addText(
    "subtitle",
    82,
    170,
    1050,
    "Two product surfaces share one Core-owned indexing and query path.",
    { size: "m", color: "grey" },
  );
  addGeo("one-path", 1160, 125, 360, 82, "One implementation path\nExtension and CLI share Core", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });

  addText("surface-heading", 100, 262, 300, "PRODUCT SURFACES", {
    color: "blue",
    size: "s",
  });
  addGeo("vscode", 120, 310, 210, 92, "VS Code\nDeveloper surface", {
    color: "light-blue",
    fill: "solid",
    size: "m",
  });
  addGeo("extension-host", 400, 300, 270, 112, "VS Code extension host\nlifecycle · settings · plugins", {
    color: "light-blue",
    fill: "semi",
    size: "m",
  });
  addGeo("react-webview", 740, 300, 290, 112, "React webview\nGraph View · controls · state", {
    color: "light-blue",
    fill: "semi",
    size: "m",
  });
  addGeo("agent", 1070, 310, 160, 92, "Agent / CI\nAgent Skill", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("cli", 1290, 310, 190, 92, "CodeGraphy CLI\nJSON output", {
    color: "light-green",
    fill: "solid",
    size: "m",
  });
  addText("no-mcp", 1072, 415, 410, "No MCP path. The Agent Skill teaches the Core-owned CLI.", {
    color: "grey",
    size: "s",
  });

  addText("core-heading", 100, 518, 300, "CORE-OWNED PATH", {
    color: "green",
    size: "s",
  });
  addGeo("core-package", 610, 525, 380, 82, "Core package\none index + query API", {
    color: "light-green",
    fill: "solid",
    size: "m",
  });
  addGeo("settings", 120, 640, 180, 80, ".codegraphy/\nsettings.json", {
    color: "grey",
    fill: "semi",
    size: "m",
  });
  addGeo("discovery", 350, 640, 190, 80, "File discovery", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("analysis", 590, 630, 210, 100, "Tree-sitter +\nplugin analysis", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("projection", 850, 640, 190, 80, "Graph projection", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("memory", 1090, 630, 190, 100, "Relationship Graph\nin memory", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("query", 1330, 640, 150, 80, "Graph Query", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("cache", 1060, 742, 250, 58, "SQLite Graph Cache", {
    color: "grey",
    fill: "semi",
    size: "s",
  });

  addText("provider-heading", 100, 806, 340, "CAPABILITY PROVIDERS", {
    color: "orange",
    size: "s",
  });
  addGeo("plugin-api", 120, 840, 230, 82, "Plugin API\ncontracts only", {
    color: "orange",
    fill: "semi",
    size: "m",
  });
  addGeo("analysis-plugins", 400, 830, 330, 102, "Analysis plugins\nTypeScript · Markdown · Vue · Svelte\nGodot · Unity", {
    color: "orange",
    fill: "semi",
    size: "m",
  });
  addGeo("renderer", 780, 830, 300, 102, "Graph renderer\nWebGPU drawing · WASM physics\nprimary + minimap passes", {
    color: "orange",
    fill: "semi",
    size: "m",
  });
  addGeo("view-plugins", 1130, 830, 350, 102, "Graph View contributions\nruntime nodes · projections · UI · forces", {
    color: "orange",
    fill: "semi",
    size: "m",
  });
  addText("cache-guardrail", 120, 945, 400, "SQLite persists snapshots; query semantics stay in Core.", {
    color: "grey",
    size: "s",
  });
  addText("typescript-guardrail", 590, 945, 410, "TypeScript resolution stays in plugin analysis.", {
    color: "grey",
    size: "s",
  });
  addText("renderer-guardrail", 1080, 945, 400, "The extension owns policy; the renderer owns drawing and layout.", {
    color: "grey",
    size: "s",
    textAlign: "end",
  });

  beginPage("indexing");

  addGeo("full-lane", 80, 245, 1440, 285, "", {
    color: "light-green",
    fill: "solid",
    opacity: 0.12,
  });
  addGeo("incremental-lane", 80, 575, 1440, 205, "", {
    color: "light-blue",
    fill: "solid",
    opacity: 0.1,
  });
  addGeo("query-lane", 80, 825, 1440, 230, "", {
    color: "grey",
    fill: "solid",
    opacity: 0.08,
  });

  addArrow("settings-to-discovery", 300, 405, 340, 405);
  addArrow("discovery-to-preanalysis", 530, 405, 570, 405);
  addArrow("preanalysis-to-analysis", 760, 405, 800, 405);
  addArrow("analysis-to-projection", 1010, 405, 1050, 405);
  addArrow("projection-to-cache", 1240, 405, 1280, 405);
  addArrow("changes-to-engine", 300, 690, 350, 690);
  addArrow("engine-to-impact", 550, 690, 600, 690);
  addArrow("impact-to-analysis", 820, 690, 870, 690);
  addArrow("analysis-to-patch", 1090, 690, 1140, 690);
  addArrow("caller-to-load", 310, 940, 360, 940);
  addArrow("load-to-memory", 560, 940, 610, 940);
  addArrow("memory-to-query", 830, 940, 880, 940);
  addArrow("query-to-reports", 1100, 940, 1150, 940);

  addGeo("atlas-label", 80, 45, 390, 48, "CODEGRAPHY / ARCHITECTURE ATLAS", {
    color: "black",
    fill: "solid",
    labelColor: "white",
    size: "s",
  });
  addText("page-number", 1390, 56, 130, "02", {
    color: "grey",
    size: "xl",
    textAlign: "end",
  });
  addText("title", 80, 112, 920, "Indexing and query", { size: "xl" });
  addText(
    "subtitle",
    82,
    170,
    1050,
    "One workspace engine handles full builds, changed-file reconciliation, and bounded reads.",
    { color: "grey", size: "m" },
  );
  addGeo("storage-rule", 1160, 125, 360, 82, "Persistence, not a query engine\nSQLite stores snapshots; Core answers", {
    color: "grey",
    fill: "semi",
    size: "s",
  });

  addText("full-heading", 100, 262, 300, "FULL INDEX", {
    color: "green",
    size: "s",
  });
  addGeo("workspace-settings", 120, 350, 180, 110, "Workspace settings\ninclude · filters · plugins", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addGeo("discovery", 340, 350, 190, 110, "File Discovery\ngitignore · maxFiles", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("preanalysis", 570, 340, 190, 130, "Pre-analysis\ncore + plugin bulk setup", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("analysis", 800, 340, 210, 130, "Per-file analysis\nTree-sitter + plugin hooks\nsymbols · relations · evidence", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("projection", 1050, 350, 190, 110, "Graph projection\nNodes · Relationships", {
    color: "light-green",
    fill: "semi",
    size: "m",
  });
  addGeo("cache", 1280, 340, 200, 130, "SQLite Graph Cache\nsnapshot · metadata\nplugin signature", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addText("full-detail", 120, 485, 1360, "index() returns the Relationship Graph, analysis cache, discovered files, directories, and full/incremental accounting.", {
    color: "grey",
    size: "s",
  });

  addText("incremental-heading", 100, 592, 350, "INCREMENTAL UPDATE", {
    color: "blue",
    size: "s",
  });
  addGeo("file-events", 120, 645, 180, 90, "Workspace file changes\ncreate · edit · delete", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("changed-engine", 350, 645, 200, 90, "applyChangedFiles()\nchanged path selection", {
    color: "light-blue",
    fill: "solid",
    size: "s",
  });
  addGeo("plugin-impact", 600, 635, 220, 110, "Plugin invalidation\nonFilesChanged() may add\naffected workspace files", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("affected-analysis", 870, 635, 220, 110, "Affected-file analysis\nreuse unchanged cache tiers", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("patch", 1140, 635, 340, 110, "Patch + rebuild\ndelete stale facts · merge results\npatch SQLite · rebuild graph", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });

  addText("query-heading", 100, 842, 300, "QUERY PATH", {
    color: "grey",
    size: "s",
  });
  addGeo("caller", 120, 895, 190, 90, "Extension or CLI\nsame Core APIs", {
    color: "light-green",
    fill: "solid",
    size: "s",
  });
  addGeo("load", 360, 885, 200, 110, "Load snapshot\nGraph + symbols + relations", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addGeo("query-data", 610, 885, 220, 110, "In-memory data\nRelationship Graph + evidence", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("query-semantics", 880, 875, 220, 130, "Graph Query\nscope · filter · search\ntraversal · projection", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("reports", 1150, 875, 330, 130, "Bounded JSON reports\nnodes · search · edges\ndependencies · dependents · path", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addText("visible-order", 120, 1025, 1360, "Visible Graph order: Graph Scope → structural projection → Filter → Search → Show Orphans → Collapse Projection.", {
    color: "grey",
    size: "s",
  });

  beginPage("runtime");

  addGeo("host-panel", 80, 245, 430, 505, "", {
    color: "light-blue",
    fill: "solid",
    opacity: 0.12,
  });
  addGeo("protocol-panel", 555, 245, 280, 505, "", {
    color: "grey",
    fill: "solid",
    opacity: 0.08,
  });
  addGeo("webview-panel", 880, 245, 640, 505, "", {
    color: "light-blue",
    fill: "solid",
    opacity: 0.12,
  });
  addGeo("render-panel", 80, 800, 1440, 245, "", {
    color: "orange",
    fill: "solid",
    opacity: 0.1,
  });

  addArrow("host-activate-to-engine", 295, 395, 295, 440);
  addArrow("host-engine-to-services", 295, 550, 295, 595);
  addArrow("host-to-protocol", 510, 480, 555, 480, "", {
    arrowheadStart: "arrow",
  });
  addArrow("protocol-to-webview", 835, 480, 880, 480, "", {
    arrowheadStart: "arrow",
  });
  addArrow("webview-app-to-store", 1015, 395, 1015, 440);
  addArrow("webview-store-to-visible", 1015, 540, 1015, 585);
  addArrow("webview-visible-to-ui", 1195, 630, 1240, 630);
  addArrow("frame-visible-to-runtime", 300, 925, 340, 925);
  addArrow("frame-runtime-to-layout", 560, 925, 600, 925);
  addArrow("frame-layout-to-buffers", 820, 925, 860, 925);
  addArrow("frame-buffers-to-renderer", 1080, 925, 1120, 925);
  addArrow("frame-renderer-to-surfaces", 1310, 925, 1335, 925);

  addGeo("atlas-label", 80, 45, 390, 48, "CODEGRAPHY / ARCHITECTURE ATLAS", {
    color: "black",
    fill: "solid",
    labelColor: "white",
    size: "s",
  });
  addText("page-number", 1390, 56, 130, "03", {
    color: "grey",
    size: "xl",
    textAlign: "end",
  });
  addText("title", 80, 112, 920, "VS Code runtime", { size: "xl" });
  addText(
    "subtitle",
    82,
    170,
    1070,
    "The extension orchestrates product state; the webview derives presentation; the renderer executes frames.",
    { color: "grey", size: "m" },
  );
  addGeo("ownership-rule", 1160, 125, 360, 82, "Policy stays above the renderer\nHost + webview own product behavior", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });

  addText("host-heading", 100, 262, 300, "HOST OWNERSHIP", {
    color: "blue",
    size: "s",
  });
  addGeo("activation", 120, 315, 350, 80, "Extension activation\nworkspace + Graph View provider", {
    color: "light-blue",
    fill: "solid",
    size: "m",
  });
  addGeo("workspace-engine", 120, 440, 350, 110, "Core workspace engine\nindex · changed files · Graph Cache\nRelationship Graph snapshot", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("host-services", 120, 595, 350, 110, "Provider services\nsettings · plugins · commands\nfile actions · exports · diagnostics", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addText("host-note", 120, 715, 350, "Owns workspace lifecycle, persisted settings, editor integration, and message dispatch.", {
    color: "grey",
    size: "s",
  });

  addText("protocol-heading", 575, 262, 240, "TYPED PROTOCOL", {
    color: "grey",
    size: "s",
  });
  addGeo("extension-messages", 585, 330, 220, 130, "Extension → Webview\ngraph · controls · settings\nplugins · theme · commands", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addGeo("webview-messages", 585, 520, 220, 130, "Webview → Extension\nselection · files · indexing\nsettings · exports · interactions", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addText("protocol-note", 585, 675, 220, "Shared records keep the Electron host and browser runtime synchronized.", {
    color: "grey",
    size: "s",
  });

  addText("webview-heading", 900, 262, 300, "WEBVIEW STATE", {
    color: "blue",
    size: "s",
  });
  addGeo("app-shell", 920, 315, 190, 80, "React AppShell\nGraph View surface", {
    color: "light-blue",
    fill: "solid",
    size: "m",
  });
  addGeo("store", 920, 440, 190, 100, "Zustand store\ngraph · controls · plugins\nselection · viewport", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("visible-graph", 920, 585, 230, 110, "deriveVisibleGraph()\nscope → structure → filter\nsearch → orphans → collapse", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("graph-ui", 1240, 305, 240, 110, "Graph View UI\nsearch · scope · legends\nsettings · panels · toolbars", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("interactions", 1240, 455, 240, 100, "Interaction state\nfocus · selection · depth\nfile preview · context menu", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo("renderer-adapter", 1240, 595, 240, 100, "Renderer adapter\nframes · camera · hit testing\nplugin runtime contributions", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addText("webview-note", 920, 715, 560, "Owns Graph View policy and interaction. It sends resolved frame data into the renderer package.", {
    color: "grey",
    size: "s",
  });

  addText("render-heading", 100, 817, 300, "RENDER LOOP", {
    color: "orange",
    size: "s",
  });
  addGeo("frame-input", 120, 875, 180, 100, "Visible Graph\nresolved styles + camera", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("runtime-contributions", 340, 865, 220, 120, "Graph View contributions\nruntime nodes · edges\nprojections · forces", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("layout", 600, 865, 220, 120, "TypedGraphLayoutEngine\nWASM physics · pin/release\npositions + velocities", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("buffers", 860, 875, 220, 100, "Typed arrays + GPU buffers\npositions · styles · edges", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("webgpu", 1120, 865, 190, 120, "WebGpuGraphRenderer\nframe queue · camera\nnode/link/arrow passes", {
    color: "orange",
    fill: "solid",
    size: "s",
  });
  addGeo("surfaces", 1335, 875, 155, 100, "Primary + secondary\nsurface", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addText("render-note", 120, 1005, 1360, "The secondary surface reuses primary positions and geometry, but owns its camera and compact style buffers for the minimap.", {
    color: "grey",
    size: "s",
  });

  beginPage("plugins");

  addGeo("contract-panel", 80, 245, 1440, 315, "", {
    color: "orange",
    fill: "solid",
    opacity: 0.1,
  });
  addGeo("packages-panel", 80, 605, 1440, 190, "", {
    color: "light-blue",
    fill: "solid",
    opacity: 0.1,
  });
  addGeo("impact-panel", 80, 840, 1440, 220, "", {
    color: "grey",
    fill: "solid",
    opacity: 0.08,
  });

  addArrow("package-to-validation", 870, 700, 920, 700);
  addArrow("validation-to-registry", 1130, 700, 1180, 700);
  addArrow("ts-config-to-resolution", 1010, 955, 1050, 955);
  addArrow("ts-resolution-to-relation", 1240, 955, 1280, 955);

  addGeo("atlas-label", 80, 45, 390, 48, "CODEGRAPHY / ARCHITECTURE ATLAS", {
    color: "black",
    fill: "solid",
    labelColor: "white",
    size: "s",
  });
  addText("page-number", 1390, 56, 130, "04", {
    color: "grey",
    size: "xl",
    textAlign: "end",
  });
  addText("title", 80, 112, 920, "Plugin system", { size: "xl" });
  addText(
    "subtitle",
    82,
    170,
    1050,
    "One validated contract lets packages add analysis, graph semantics, and Graph View behavior.",
    { color: "grey", size: "m" },
  );
  addGeo("boundary-rule", 1160, 125, 360, 82, "Semantics stay with their owner\nCore supplies substrate, not ecosystem rules", {
    color: "orange",
    fill: "semi",
    size: "s",
  });

  addText("contract-heading", 100, 262, 320, "CONTRACT SURFACE", {
    color: "orange",
    size: "s",
  });
  addGeo("plugin-contract", 600, 280, 400, 90, "IPlugin / API v3\nvalidated at registration", {
    color: "orange",
    fill: "solid",
    size: "m",
  });
  addGeo("identity", 110, 405, 200, 110, "Identity + lifecycle\nid · version · apiVersion\ninitialize · unload", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("analysis", 335, 395, 200, 130, "Analysis hooks\nanalyzeFile() · pre-analyze\nonFilesChanged() · post-analyze", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("graph-types", 560, 405, 200, 110, "Graph facts\nnodes · symbols · relations\nNode Types · Edge Types", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("capabilities", 785, 395, 230, 130, "Graph Scope capabilities\nworkspace applicability\nfile colors · filters · sources", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("graph-view", 1040, 395, 250, 130, "graphView\nruntime nodes · edges · projections · forces · UI\ncontext menu · drag end", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("host-services", 1315, 405, 195, 110, "Host services\nGraph · webview messages\nexports · toolbar · data", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addText("contract-note", 110, 535, 1400, "The contract carries evidence and ownership into Core, CLI reports, Graph Scope, exports, and the Graph View runtime.", {
    color: "grey",
    size: "s",
  });

  addText("packages-heading", 100, 622, 300, "PLUGIN PACKAGES", {
    color: "blue",
    size: "s",
  });
  addGeo("analysis-packages", 120, 665, 400, 90, "Analysis plugins\nTypeScript · Markdown · Vue · Svelte · Godot · Unity", {
    color: "light-blue",
    fill: "semi",
    size: "m",
  });
  addGeo("particles", 560, 665, 310, 90, "Particles presentation plugin\nGraph View effect runtime", {
    color: "light-blue",
    fill: "semi",
    size: "m",
  });
  addGeo("plugin-package", 920, 665, 210, 70, "Plugin package\nfactory + manifest", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("validation", 1180, 665, 150, 70, "API validation", {
    color: "grey",
    fill: "semi",
    size: "m",
  });
  addGeo("registry", 1380, 665, 110, 70, "Core\nregistry", {
    color: "light-green",
    fill: "solid",
    size: "m",
  });
  addText("packages-note", 920, 750, 570, "Enablement + workspace applicability decide which capabilities become available.", {
    color: "grey",
    size: "s",
    textAlign: "end",
  });

  addText("impact-heading", 100, 857, 300, "CHANGE IMPACT", {
    color: "grey",
    size: "s",
  });
  addGeo("impact-policy", 120, 900, 550, 120, "IPluginUpdateImpactPolicy\nview-only · settings-only · projection-only\nreanalyze-plugin-files · requires-full-index", {
    color: "grey",
    fill: "semi",
    size: "m",
  });
  addText("impact-note", 120, 1025, 550, "A toggle declares the smallest correct amount of graph work; the host does not guess.", {
    color: "grey",
    size: "s",
  });

  addText("typescript-heading", 760, 857, 520, "TYPESCRIPT PROJECT RESOLUTION", {
    color: "orange",
    size: "s",
  });
  addGeo("ts-config", 760, 910, 250, 90, "nearest tsconfig.json\nwithin workspace root", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("ts-resolution", 1050, 900, 190, 110, "extends chain\nbaseUrl · paths\nexact + wildcard aliases", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo("ts-edge", 1280, 910, 220, 90, "TypeScript Alias Import\nplugin-owned Relationship", {
    color: "orange",
    fill: "solid",
    size: "s",
  });
  addText("typescript-note", 760, 1025, 740, "Project-aware resolution stays in plugin analysis; Core merges and projects the resulting evidence normally.", {
    color: "grey",
    size: "s",
    textAlign: "end",
  });

  return {
    tldrawFileFormatVersion: 1,
    schema: tldrawSchema,
    records: [...createBaseRecords(), ...records],
  };
}

export function serializeArchitectureBoard(): string {
  return JSON.stringify(buildArchitectureBoard(), null, 2) + "\n";
}

export async function writeArchitectureBoard(
  destination = fileURLToPath(new URL("main.tldr", import.meta.url)),
): Promise<string> {
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, serializeArchitectureBoard(), "utf8");
  return destination;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void writeArchitectureBoard()
    .then((destination) => {
      process.stdout.write("Generated " + destination + "\n");
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      process.stderr.write(message + "\n");
      process.exitCode = 1;
    });
}
