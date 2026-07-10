# CodeGraphy Rust Core Plan

> **For agentic workers:** This is the umbrella/handoff plan for the Rust core
> track. Each phase is too large for a single session; when starting a phase,
> write a detailed task-level implementation plan for that phase first
> (superpowers:writing-plans style, checkbox tasks with failing-test steps),
> using this doc's checkpoints as that plan's acceptance criteria.

Sibling plan: [WebGPU graph surface plan](2026-07-10-webgpu-graph-surface-plan.md)
(Track A). The two tracks are independent until the Convergence phases at the
bottom of this doc.

**Goal:** Replace CodeGraphy's TypeScript indexing core with an installable
Rust binary (`codegraphy`) that serves CLI, MCP, and VS Code from one engine —
indexing, SQLite cache, query, projections/diffs, and the plugin registry.

**Architecture:** One installed binary. `codegraphy stdio` is a long-lived
child process speaking JSON-RPC 2.0 (LSP-style framing) for control plus
length-prefixed binary frames for graph payloads. The VS Code extension
becomes a thin protocol client; the extension host never parses graph
payloads. SQLite (WAL) is the durable cache with a single-writer election per
workspace.

**Tech Stack:** Rust (tree-sitter, rusqlite bundled, notify, wasmtime later),
JSON-RPC 2.0 + Content-Length framing, platform-specific VSIXes.

## Source Documents (read these first)

- [Rust core architecture brainstorm](2026-07-09-rust-core-webgpu-architecture-brainstorm.md)
  — core/protocol/plugin/SQLite/remote/distribution design and precedents
  (rust-analyzer, Biome, Deno, SWC, Oxc, Zed, Lapce, Tauri).

## Global Constraints (locked decisions — do not relitigate)

- **Browser-hosted VS Code (vscode.dev) unsupported**; show a clear message.
  Remote SSH/WSL/containers **are** supported (binary runs on remote host).
- Payload rule: **the extension host never parses graph payloads** — binary
  frames pass through untouched via `postMessage` ArrayBuffer transfer.
- Visibility boundary: the core serves graph facts and query/filter/search
  results; it does not know about view-level visibility. Collapse/folder-view
  grouping is an extension/webview feature — the core schema and protocol
  must not grow collapse state.
- The timeline view is removed (Track A2 in the sibling plan); the core never
  implements timeline data.
- **No JS plugin compatibility host in this program** (see B5).
- Plugins never get raw renderer access; plugin UI flows as descriptors from
  core, plugin data as facts through core.
- Repo workflow rules apply to every phase: acceptance scenarios for
  user-visible behavior, CRAP ≤ 8, scoped differential mutation testing
  (never full-suite), pre-commit typecheck must pass.

## Phase Sequence

```text
B0 protocol skeleton → B1 indexer MVP + differential harness
→ B2 concurrency/watching → B3 query/projection/diffs
→ B4 extension sidecar → B5 wasm plugin host → B6 CLI/MCP surfaces
→ C1 binary path end-to-end → C2 full-loop perf → C3 cleanup
```

B0/B1 can start today, in parallel with the sibling plan's A0/A1.

---

### B0. Protocol Spec + Skeleton

**Deliverables**

- Crates: `codegraphy-cli` (binary), `codegraphy-core`, `codegraphy-protocol`
  (see the Rust Setup Walkthrough below for the workspace layout).
- `codegraphy stdio`: JSON-RPC 2.0 over LSP-style `Content-Length` framing;
  `initialize` handshake exchanging protocol + binary-format versions;
  `$/cancelRequest`, `$/progress`; binary frame channel (length-prefixed
  frames referenced by id from JSON results).
- Written protocol spec in-repo (`docs/protocol.md`): every method from the
  brainstorm doc's list with request/response schemas, revision semantics
  (every projection/diff carries its source revision; missed diff ⇒ client
  requests snapshot).

**Checkpoints**

- [ ] Integration test: spawn binary, initialize, mismatched version is
      refused with a typed error; `cargo test` green in CI for the crate
      workspace.
- [ ] A TS test client (in-repo) round-trips a request and receives a binary
      frame ≥ 1MB intact (checksum verified).

### B1. Indexer MVP + Differential Harness

**Deliverables**

- Tree-sitter parsing (start: TypeScript/JavaScript + Markdown — the near-core
  languages), SQLite schema (WAL, migrations table), files/symbols/relations
  tables, FTS index for symbol search; `codegraphy index`, `codegraphy
  status`. This subsumes and eventually replaces the existing
  `packages/core/src/graphCache` database layer — study its records/query
  modules for the fact model before designing the schema.
- **Differential harness** (the phase's centerpiece): index the fixture/example
  repos (`examples/`) with both the current TS core and the Rust core; diff
  emitted nodes/edges; report format committed.

**Checkpoints**

- [ ] Differential report on all example repos: 100% node parity, edge parity
      ≥ 99% with every discrepancy triaged in the report (bug vs accepted
      improvement).
- [ ] Index throughput recorded; target: full index of the CodeGraphy repo
      itself ≥ 5× faster than the current TS core on the same machine.
- [ ] `codegraphy index && codegraphy status` on a fixture repo exits 0 and
      reports counts matching the harness.

### B2. Concurrency, Watching, Incremental

**Deliverables**

- WAL + busy_timeout; single-writer election (advisory lock + PID/heartbeat,
  reader promotion); `notify`-based watcher owned by the elected writer;
  debounced incremental re-index; revision counter + change notification to
  connected clients.

**Checkpoints**

- [ ] Test: two `codegraphy stdio` processes on one workspace — exactly one
      indexes (assert via status); kill the writer; the reader promotes and
      indexing resumes (integration test, deterministic with heartbeat
      timeout override).
- [ ] Incremental: touching one file re-indexes only that file's scope;
      end-to-end update visible to a subscribed client < 500ms on the fixture
      repo (test with timing assertion, generous CI margin).
- [ ] Schema migration under contention: writer migrates, concurrent reader
      never observes a half-migrated schema (test).

### B3. Query, Projection, Diffs

**Deliverables**

- Query engine: search/filter/sort/scope/graph traversal matching the current
  extension's data layer semantics; visible-graph projection as
  struct-of-arrays binary frames (format doc committed — this format is the
  C1 contract, co-designed with Track A's buffer layout); `getGraphDiff`
  between revisions; node/edge detail lookup.
- Persisted layout positions keyed by stable node identity, with a defined
  rename/move policy (content-assisted identity or explicit position
  migration on rename — positions must survive common refactors).
- Settings ownership split, documented: settings that affect indexed data or
  projections (filters, scopes, plugin enablement) live in/flow through core;
  purely visual settings (including collapse state) stay
  extension/webview-side.

**Checkpoints**

- [ ] Golden tests: projections for seeded fixtures byte-stable across runs.
- [ ] Diff soundness property test: snapshot(rev A) + diffs(A→B) ==
      snapshot(rev B) for randomized edit sequences.
- [ ] Query latency: filter+search+projection on 100k-node synthetic
      workspace < 50ms (bench in CI, informational not blocking).

### B4. Extension Sidecar Integration

**Deliverables**

- Extension spawns/discovers the binary (bundled per-platform VSIX using the
  existing tree-sitter-natives pipeline; `codegraphy.path` override); process
  lifecycle (restart on crash, version handshake surfacing); extension data
  layer swapped to protocol client behind its existing interface; web
  environment detection → "requires desktop VS Code" notice; Windows
  binary-lock update workaround; diagnostics: core stderr/log stream surfaced
  in a VS Code output channel, `codegraphy status --json` wired into an
  extension "doctor" command for bug reports.

**Checkpoints**

- [ ] Acceptance suite green with the Rust core supplying graph data.
- [ ] Manual matrix recorded in PR: local macOS, local Windows, Remote SSH
      (binary on remote), WSL, dev container; each loads a graph.
- [ ] Kill the core process mid-session: extension restarts it and recovers
      the view via snapshot resync (integration test).

### B5. Wasm Plugin Host + Plugin Migration

**Deliverables**

- Wasmtime component-model host; WIT interface exposing parse-once AST/query
  access, fact emission, and manifest-declared UI contribution descriptors;
  fuel/epoch limits; `codegraphy plugin install/list/enable`.
- Per-plugin migration (decided): **no JS compatibility host in this
  program.** All plugins are first-party and in-repo, so embedding a JS
  engine in the Rust core to run four of our own plugins is a large subsystem
  with no payoff. typescript + markdown fold into core as built-ins;
  godot/unity/vue/svelte are rewritten as Rust→wasm plugins, validated by the
  differential harness; particles stays webview-only. An Oxc-style JS host
  remains a documented future option if a third-party TS plugin ecosystem
  materializes — it is explicitly out of scope here.

**Checkpoints**

- [ ] Differential parity per migrated plugin on its example repo (same
      harness as B1).
- [ ] Sandbox test: a plugin that infinite-loops is terminated by
      fuel/epoch limit without stalling indexing (integration test).
- [ ] Extension renders plugin UI contributions purely from core descriptors
      (no plugin-specific extension code) for one migrated plugin.

### B6. CLI + MCP Surfaces

**Deliverables**

- Human CLI (`index`, `query`, `status`, `plugin …`) with stable JSON output
  mode; MCP adapter (`codegraphy mcp`) exposing the same tools the current
  `packages/mcp` provides, backed by the core protocol.

**Checkpoints**

- [ ] Existing MCP package's tool-level tests pass against the new adapter
      (or a mapped equivalent suite); old TS MCP package deleted.
- [ ] `codegraphy query --json` output schema documented + golden-tested.

---

## Convergence (requires the sibling plan's A4+ renderer)

### C1. Binary Path End-To-End

Wire B3's binary projections through the extension (opaque pass-through) into
the WebGPU renderer's GPU buffers.

**Checkpoints**

- [ ] Assertion in code + test: extension host performs zero
      parse/re-serialize of projection frames (frames pass through with only
      envelope handling; verified by checksum at both ends).
- [ ] Trace on the 100k fixture: core-emit → GPU-buffer-written < 100ms for a
      full projection swap; diffs < 16ms.
- [ ] Remote SSH: same flow over the remote channel; diff-driven update after
      a file save < 1s end-to-end (manual, recorded).

### C2. Full-Loop Performance Validation

- [ ] The sibling plan's A0 harness, now driven by the real core on real
      repos, meets every committed budget (60fps at 100k nodes / 300k edges;
      index 5× baseline; interactive force sliders reflected next frame).
      Results committed as the program's exit report.

### C3. Cleanup And Deprecation

- [ ] Old TS indexing/data-layer code deleted from `packages/core`/extension;
      react-force-graph adapter deleted (sibling plan A7 done); docs updated;
      decision on keeping the Canvas fallback long-term recorded.

---

## Shipping And Release Plan

### Rollout Gates

- Track B ships dark first: B4 can ship with a `useRustCore` experimental
  setting, running the differential harness in CI on every release until
  cutover confidence is earned.
- Version discipline: extension and binary versions are released in lockstep
  while bundled; the protocol handshake makes any drift a clean error, not
  silent corruption.

### Distribution: Install The Extension, Get Everything

The ideal path — user installs the CodeGraphy extension and the core is just
there — is achievable, but not via an npm dependency. The core is a native
binary per OS/architecture; npm dependencies of an extension are JS code
bundled at packaging time and cannot deliver per-platform native executables
cleanly. The VS Code-native mechanism that gives the same result is
**platform-specific extensions**: the Marketplace lets one extension publish
separate VSIX payloads per target, and VS Code automatically picks the right
one at install time — including installing the matching build on the remote
host in SSH/WSL/container sessions.

```text
vsce publish --target darwin-arm64    (VSIX contains bin/codegraphy, macOS arm64)
vsce publish --target darwin-x64
vsce publish --target win32-x64
vsce publish --target win32-arm64
vsce publish --target linux-x64
vsce publish --target linux-arm64
vsce publish --target alpine-x64      (musl build, for containers)
```

The repo already builds platform VSIXes for the Tree-sitter natives, so this
pipeline exists — the Rust binary becomes one more per-platform artifact in
it. Extension activation then does: use `codegraphy.path` if set → else use
the bundled binary → verify with the protocol handshake → clear error UI on
failure. No download step, works offline, one-click install. (Fallback
option if VSIX size ever becomes a problem: download-on-first-activation
with checksum verification, the rust-analyzer model — not needed initially.)

Independent CLI installs (`cargo install codegraphy`, Homebrew, npm wrapper
package with platform binaries à la esbuild/Biome) are optional extras for
CLI/MCP users, published from the same release pipeline — the extension never
depends on them.

### Release Pipeline (CI)

- On B0 landing, CI grows a Rust leg: `cargo fmt --check`, `cargo clippy --
  -D warnings`, `cargo test` on the workspace, on Linux/macOS/Windows
  runners.
- Release builds cross-compile the target matrix above (GitHub Actions
  matrix; `cross` or Zig-assisted linking for the musl/arm64 targets built
  on x64 runners), strip the binaries, and hand them to the existing VSIX
  packaging step.
- The differential harness (B1) runs on every release build until the old TS
  core is deleted (C3); a regression blocks release.

### Rust Setup Walkthrough (for a Rust newcomer)

One-time machine setup:

```bash
# Installs rustc (compiler), cargo (build tool + package manager), rustup (toolchain manager)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add clippy rustfmt   # linter + formatter
```

Mental model, mapped to what you know: **cargo** is pnpm+turbo in one,
**crates.io** is npm, **Cargo.toml** is package.json, **Cargo.lock** is the
lockfile (committed), a **crate** is a package, and a cargo **workspace** is
a pnpm monorepo. `clippy` is ESLint, `rustfmt` is Prettier, tests live next
to the code (`#[cfg(test)]` modules) or in `tests/` for integration tests —
no separate test-runner dependency.

Repo layout (new top-level `crates/` directory beside `packages/`):

```text
crates/
  Cargo.toml            # workspace root (below)
  codegraphy-cli/       # binary crate → produces the `codegraphy` executable
    Cargo.toml
    src/main.rs
  codegraphy-core/      # library crate: indexing, SQLite, query, plugins
    Cargo.toml
    src/lib.rs
  codegraphy-protocol/  # library crate: request/response types, framing
    Cargo.toml
    src/lib.rs
```

Workspace root `crates/Cargo.toml`:

```toml
[workspace]
members = ["codegraphy-cli", "codegraphy-core", "codegraphy-protocol"]
resolver = "2"

[workspace.dependencies]        # shared version pins, like pnpm catalog
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }  # compiles SQLite in — no system dep
tree-sitter = "0.22"
notify = "6"

[profile.release]
lto = "thin"
strip = true                    # smaller binaries for the VSIX
```

A member crate, e.g. `codegraphy-cli/Cargo.toml`:

```toml
[package]
name = "codegraphy-cli"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "codegraphy"             # the executable's name, regardless of crate name
path = "src/main.rs"

[dependencies]
codegraphy-core = { path = "../codegraphy-core" }
codegraphy-protocol = { path = "../codegraphy-protocol" }
serde_json = { workspace = true }
```

Daily commands (run from `crates/`):

```bash
cargo build                    # dev build → target/debug/codegraphy
cargo run -- index             # build + run with args (the -- separates cargo's args from yours)
cargo test                     # all workspace tests
cargo test -p codegraphy-core  # one crate's tests (-p = --package)
cargo clippy -- -D warnings    # lint, warnings as errors
cargo fmt                      # format everything
cargo build --release          # optimized build → target/release/codegraphy
cargo add serde -p codegraphy-core   # add a dependency (like pnpm add)
```

Cross-compiling for the release matrix (CI does this; locally you mostly
build your own platform):

```bash
rustup target add aarch64-apple-darwin   # one-time per target
cargo build --release --target aarch64-apple-darwin
```

Gotchas worth knowing on day one: the borrow checker will fight you for the
first weeks — prefer cloning small data over fighting lifetimes while
learning; `target/` is the (large) build cache, gitignore it; `rusqlite`
with the `bundled` feature avoids all system-SQLite version pain; and
`cargo doc --open` renders every dependency's API docs locally, which is the
idiomatic way to read Rust library documentation.

## Risk Register

1. **Fact parity of the Rust indexer** (B1/B5) — the differential harness is
   the safety net; no phase advances with untriaged discrepancies.
2. **Payload path regressions** (C1) — any hop that reintroduces per-node JS
   objects silently erases the win; the zero-parse checksum test guards it.
3. **Scope creep in plugin host** (B5) — WIT surface starts minimal
   (parse-once queries + facts + UI descriptors); anything more is a new
   decision.

## Handoff Notes

- Worktree/PR conventions, acceptance-spec ownership guard, and pre-commit
  typecheck are enforced by hooks — commits will run them.
- Quality loop: acceptance scenarios first for user-visible behavior; CRAP ≤ 8
  on changed code; differential (scoped) mutation testing only.
- Benchmarks live in `docs/plans/benchmarks/`; every perf checkpoint commits
  its JSON so trends are diffable.
- When a phase starts: (1) re-read the brainstorm doc section, (2) write the
  task-level plan, (3) copy this doc's checkpoints in as acceptance criteria,
  (4) tick checkboxes here as phases complete — this file is the Rust track's
  single source of progress truth.
