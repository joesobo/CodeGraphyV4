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
  color?: string;
  dash?: string;
  fill?: string;
  geo?: string;
  labelColor?: string;
  opacity?: number;
  size?: string;
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
  return [
    {
      x: 0,
      y: 0,
      lastActivityTimestamp: 0,
      meta: {},
      id: "pointer:pointer",
      typeName: "pointer",
    },
    {
      x: 20,
      y: 20,
      z: 0.7,
      meta: {},
      id: "camera:page:page",
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
      id: "instance_page_state:page:page",
      pageId: "page:page",
      typeName: "instance_page_state",
    },
    {
      meta: {},
      id: "page:page",
      name: "Architecture",
      index: "a1",
      typeName: "page",
    },
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
      currentPageId: "page:page",
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
  let indexCursor = 0;

  function nextIndex(): string {
    const character = indexCharacters[indexCursor];
    if (character === undefined) {
      throw new Error("The architecture board has more shapes than its index sequence supports.");
    }
    indexCursor += 1;
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
      id: "shape:" + id,
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
        align: "middle",
        verticalAlign: "middle",
        richText: createRichText(label),
      },
      parentId: "page:page",
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
      id: "shape:" + id,
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
      parentId: "page:page",
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
      id: "shape:" + id,
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
      parentId: "page:page",
      index: nextIndex(),
      typeName: "shape",
    });
  }

  // Connectors are added first so they render beneath the nodes.
  addArrow("user-to-host", 320, 285, 420, 285, "opens");
  addArrow("host-to-webview", 720, 285, 1110, 285);
  addArrow("webview-to-renderer", 1260, 365, 1260, 455, "render model");
  addArrow("agent-to-core", 320, 675, 430, 745);
  addArrow("host-to-core", 560, 365, 500, 700, "same Core APIs", { bend: -36 });
  addArrow("core-to-discovery", 600, 755, 650, 755);
  addArrow("discovery-to-analysis", 810, 755, 850, 755);
  addArrow("analysis-to-projection", 1030, 755, 1070, 755);
  addArrow("projection-to-cache", 1150, 810, 1110, 895, "persists");
  addArrow("cache-to-query", 1000, 945, 740, 945, "loads snapshots");
  addArrow("core-to-query", 520, 810, 590, 895, "query");
  addArrow("api-to-language", 1430, 795, 1430, 885, "implemented by");
  addArrow("language-to-analysis", 1260, 950, 1000, 810, "graph facts", { bend: 28 });
  addArrow("particles-to-webview", 1320, 1080, 1360, 365, "effect runtime", { bend: 74 });
  addArrow("settings-to-core", 360, 945, 430, 780, "workspace state");

  addText("title", 80, 55, 760, "CodeGraphy architecture", { size: "xl" });
  addText(
    "subtitle",
    82,
    118,
    1180,
    "One Core-owned graph pipeline, shared by the VS Code product and the agent-facing CLI.",
    { size: "m", color: "grey" },
  );

  addText("entry-heading", 80, 205, 260, "Entrypoints", { size: "l" });
  addGeo("developer", 80, 250, 240, 115, "Developer\nVS Code", {
    color: "light-blue",
    fill: "semi",
  });
  addGeo("agent", 80, 615, 240, 120, "Agent / CI\nCodeGraphy Agent Skill", {
    color: "light-green",
    fill: "semi",
  });
  addText(
    "no-mcp",
    82,
    755,
    270,
    "No MCP path. The skill teaches agents to call the Core-owned CLI.",
    { size: "s", color: "grey" },
  );

  addText("product-heading", 420, 175, 700, "VS Code product boundary", { size: "l" });
  addGeo(
    "extension-host",
    420,
    220,
    300,
    145,
    "VS Code extension host\nworkspace lifecycle · settings · plugins",
    { color: "light-blue", fill: "semi", size: "s" },
  );
  addGeo("shared-protocol", 820, 235, 230, 100, "Shared protocol\nhost ↔ webview", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addGeo("graph-view", 1110, 220, 300, 145, "React webview\nGraph View · controls · state", {
    color: "light-blue",
    fill: "semi",
    size: "s",
  });
  addGeo(
    "graph-renderer",
    1110,
    455,
    300,
    140,
    "Graph renderer\nWebGPU drawing · WASM physics",
    { color: "orange", fill: "semi", size: "s" },
  );
  addText(
    "renderer-note",
    1115,
    610,
    310,
    "The extension owns lifecycle and interaction. The renderer owns an efficient drawing and layout runtime.",
    { size: "s", color: "grey" },
  );

  addText("core-heading", 430, 635, 650, "Core owns graph truth", { size: "l" });
  addGeo("core-api", 430, 700, 170, 110, "Core package\nindex + query API", {
    color: "light-green",
    fill: "solid",
    size: "s",
  });
  addGeo("discovery", 650, 700, 160, 110, "File\ndiscovery", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("analysis", 850, 700, 180, 110, "Tree-sitter +\nplugin analysis", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("projection", 1070, 700, 160, 110, "Graph\nprojection", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("query", 520, 895, 220, 100, "Graph Query\nin-memory semantics", {
    color: "light-green",
    fill: "semi",
    size: "s",
  });
  addGeo("cache", 1000, 895, 220, 100, ".codegraphy/graph.sqlite\nSQLite Graph Cache", {
    color: "grey",
    fill: "semi",
    size: "s",
  });
  addText(
    "sqlite-note",
    790,
    1020,
    430,
    "SQLite persists snapshots. Traversal, scope, filtering, search, and projection remain Core-owned.",
    { size: "s", color: "grey" },
  );
  addGeo(
    "settings",
    80,
    900,
    280,
    90,
    ".codegraphy/settings.json\nshared workspace state",
    { color: "grey", fill: "semi", size: "s" },
  );

  addText("plugins-heading", 1260, 675, 330, "Plugin boundary", {
    size: "l",
  });
  addGeo("plugin-api", 1305, 720, 250, 100, "Plugin API\ncontracts only", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addGeo(
    "language-plugins",
    1260,
    885,
    350,
    130,
    "Analysis plugins\nTypeScript · Markdown · Vue · Svelte\nGodot · Unity",
    { color: "orange", fill: "semi", size: "s" },
  );
  addGeo("particles", 1260, 1040, 350, 90, "Presentation plugin\nParticles", {
    color: "orange",
    fill: "semi",
    size: "s",
  });
  addText(
    "plugin-note",
    1265,
    1150,
    380,
    "TypeScript resolution stays in plugin analysis. Plugins contribute Nodes, Relationships, types, and evidence.",
    { size: "s", color: "grey" },
  );

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
