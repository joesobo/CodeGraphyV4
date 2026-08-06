use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::async_runtime::{Mutex, Receiver};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

const MAX_EDITABLE_FILE_BYTES: u64 = 5 * 1024 * 1024;
const MAX_RECENT_WORKSPACES: usize = 8;
const RECENT_WORKSPACES_FILE_NAME: &str = "recent-workspaces.json";

const MENU_OPEN_WORKSPACE: &str = "file.open-workspace";
const MENU_OPEN_RECENT_PREFIX: &str = "file.open-recent.";
const MENU_CLEAR_RECENT: &str = "file.clear-recent";
const MENU_CLOSE_WORKSPACE: &str = "file.close-workspace";
const MENU_SAVE: &str = "file.save";

const EVENT_OPEN_WORKSPACE: &str = "desktop-open-workspace";
const EVENT_OPEN_RECENT_WORKSPACE: &str = "desktop-open-recent";
const EVENT_RECENT_WORKSPACES_CHANGED: &str = "desktop-recent-workspaces-changed";
const EVENT_CLOSE_WORKSPACE: &str = "desktop-close-workspace";
const EVENT_SAVE: &str = "desktop-save";

#[derive(Default)]
struct WorkspaceState {
    root: RwLock<Option<PathBuf>>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecentWorkspaceFile {
    paths: Vec<PathBuf>,
}

struct RecentWorkspaceStore {
    file_path: PathBuf,
    paths: RwLock<Vec<PathBuf>>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecentWorkspace {
    path: String,
    name: String,
    available: bool,
}

impl RecentWorkspaceStore {
    fn load(file_path: PathBuf) -> Result<Self, String> {
        let paths = match fs::read(&file_path) {
            Ok(bytes) => {
                let stored: RecentWorkspaceFile = serde_json::from_slice(&bytes)
                    .map_err(|error| format!("Unable to read recent workspaces: {error}"))?;
                normalize_recent_workspace_paths(stored.paths)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(format!("Unable to read recent workspaces: {error}")),
        };
        Ok(Self {
            file_path,
            paths: RwLock::new(paths),
        })
    }

    fn list(&self) -> Result<Vec<RecentWorkspace>, String> {
        self.paths
            .read()
            .map_err(|_| "Recent workspace state is unavailable.".to_string())?
            .iter()
            .map(|path| {
                let name = path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .unwrap_or_else(|| path.to_string_lossy().into_owned());
                Ok(RecentWorkspace {
                    path: path.to_string_lossy().into_owned(),
                    name,
                    available: path.is_dir(),
                })
            })
            .collect()
    }

    fn remember(&self, workspace_root: &Path) -> Result<(), String> {
        let canonical = canonical_workspace_root(workspace_root)?;
        let mut paths = self
            .paths
            .write()
            .map_err(|_| "Recent workspace state is unavailable.".to_string())?;
        paths.retain(|path| path != &canonical);
        paths.insert(0, canonical);
        paths.truncate(MAX_RECENT_WORKSPACES);
        self.persist(&paths)
    }

    fn clear(&self) -> Result<(), String> {
        let mut paths = self
            .paths
            .write()
            .map_err(|_| "Recent workspace state is unavailable.".to_string())?;
        paths.clear();
        self.persist(&paths)
    }

    fn persist(&self, paths: &[PathBuf]) -> Result<(), String> {
        let parent = self
            .file_path
            .parent()
            .ok_or_else(|| "Unable to resolve the recent workspace folder.".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create the app configuration folder: {error}"))?;
        let mut temporary = tempfile::NamedTempFile::new_in(parent)
            .map_err(|error| format!("Unable to create recent workspace data: {error}"))?;
        serde_json::to_writer_pretty(
            temporary.as_file_mut(),
            &RecentWorkspaceFile {
                paths: paths.to_vec(),
            },
        )
        .map_err(|error| format!("Unable to write recent workspaces: {error}"))?;
        temporary
            .write_all(b"\n")
            .and_then(|_| temporary.flush())
            .and_then(|_| temporary.as_file().sync_all())
            .map_err(|error| format!("Unable to write recent workspaces: {error}"))?;
        temporary
            .persist(&self.file_path)
            .map_err(|error| format!("Unable to replace recent workspaces: {}", error.error))?;
        Ok(())
    }
}

fn normalize_recent_workspace_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut normalized = Vec::new();
    for path in paths {
        if !normalized.contains(&path) {
            normalized.push(path);
        }
        if normalized.len() == MAX_RECENT_WORKSPACES {
            break;
        }
    }
    normalized
}

fn build_app_menu(
    app: &AppHandle,
    recents: &RecentWorkspaceStore,
) -> tauri::Result<Menu<tauri::Wry>> {
    let codegraphy = Submenu::with_items(
        app,
        "CodeGraphy",
        true,
        &[
            &PredefinedMenuItem::about(app, None, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let recent_workspaces = recents.list().map_err(std::io::Error::other)?;
    let recent_items = recent_workspaces
        .iter()
        .enumerate()
        .map(|(index, workspace)| {
            MenuItem::with_id(
                app,
                format!("{MENU_OPEN_RECENT_PREFIX}{index}"),
                &workspace.name,
                workspace.available,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    let empty_recent = MenuItem::with_id(
        app,
        "file.no-recent-workspaces",
        "No Recent Workspaces",
        false,
        None::<&str>,
    )?;
    let clear_recent = MenuItem::with_id(
        app,
        MENU_CLEAR_RECENT,
        "Clear Menu",
        !recent_workspaces.is_empty(),
        None::<&str>,
    )?;
    let open_recent = Submenu::new(app, "Open Recent", true)?;
    if recent_items.is_empty() {
        open_recent.append(&empty_recent)?;
    } else {
        for item in &recent_items {
            open_recent.append(item)?;
        }
    }
    open_recent.append(&PredefinedMenuItem::separator(app)?)?;
    open_recent.append(&clear_recent)?;

    let open_workspace = MenuItem::with_id(
        app,
        MENU_OPEN_WORKSPACE,
        "Open Workspace…",
        true,
        Some("CmdOrCtrl+O"),
    )?;
    let close_workspace = MenuItem::with_id(
        app,
        MENU_CLOSE_WORKSPACE,
        "Close Workspace",
        true,
        None::<&str>,
    )?;
    let save = MenuItem::with_id(app, MENU_SAVE, "Save", true, Some("CmdOrCtrl+S"))?;
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &open_workspace,
            &open_recent,
            &PredefinedMenuItem::separator(app)?,
            &close_workspace,
            &save,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    let window = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, Some("Zoom"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
            &PredefinedMenuItem::bring_all_to_front(app, None)?,
        ],
    )?;
    Menu::with_items(app, &[&codegraphy, &file, &edit, &window])
}

fn refresh_app_menu(app: &AppHandle, recents: &RecentWorkspaceStore) -> Result<(), String> {
    let menu = build_app_menu(app, recents)
        .map_err(|error| format!("Unable to build the app menu: {error}"))?;
    app.set_menu(menu)
        .map_err(|error| format!("Unable to update the app menu: {error}"))?;
    Ok(())
}

fn handle_menu_event(app: &AppHandle, menu_id: &str) {
    let emit = |event: &str| {
        let _ = app.emit(event, ());
    };
    match menu_id {
        MENU_OPEN_WORKSPACE => emit(EVENT_OPEN_WORKSPACE),
        MENU_CLEAR_RECENT => {
            let recents = app.state::<RecentWorkspaceStore>();
            if recents.clear().is_ok() && refresh_app_menu(app, &recents).is_ok() {
                emit(EVENT_RECENT_WORKSPACES_CHANGED);
            }
        }
        MENU_CLOSE_WORKSPACE => emit(EVENT_CLOSE_WORKSPACE),
        MENU_SAVE => emit(EVENT_SAVE),
        _ => {
            let Some(index) = menu_id
                .strip_prefix(MENU_OPEN_RECENT_PREFIX)
                .and_then(|value| value.parse::<usize>().ok())
            else {
                return;
            };
            let recents = app.state::<RecentWorkspaceStore>();
            let Ok(workspaces) = recents.list() else {
                return;
            };
            if let Some(workspace) = workspaces
                .get(index)
                .filter(|workspace| workspace.available)
            {
                let _ = app.emit(EVENT_OPEN_RECENT_WORKSPACE, workspace.path.clone());
            }
        }
    }
}

#[derive(Default)]
struct CoreService {
    inner: Mutex<CoreServiceState>,
}

#[derive(Default)]
struct CoreServiceState {
    process: Option<CoreProcess>,
    next_request_id: u64,
}

struct CoreProcess {
    child: Option<CommandChild>,
    events: Receiver<CommandEvent>,
}

enum CoreRequestAction {
    Open,
    Index,
    Update { relative_path: String },
}

impl CoreRequestAction {
    fn method(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Index => "index",
            Self::Update { .. } => "update",
        }
    }
}

impl Drop for CoreProcess {
    fn drop(&mut self) {
        if let Some(child) = self.child.take() {
            let _ = child.kill();
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileDocument {
    path: String,
    content: String,
    revision: String,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum CoreMessage {
    Event {
        event: String,
        #[serde(flatten)]
        details: Map<String, Value>,
    },
    Response {
        id: Option<u64>,
        #[serde(flatten)]
        outcome: CoreResponseOutcome,
    },
}

#[derive(Deserialize)]
#[serde(tag = "outcome", rename_all = "lowercase")]
enum CoreResponseOutcome {
    Success { result: Value },
    Error { error: String },
}

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn canonical_workspace_root(path: &Path) -> Result<PathBuf, String> {
    let root = path
        .canonicalize()
        .map_err(|error| format!("Unable to open workspace: {error}"))?;
    if !root.is_dir() {
        return Err("The selected workspace is not a folder.".to_string());
    }
    Ok(root)
}

fn resolve_workspace_file(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path);
    if relative.as_os_str().is_empty() || relative.is_absolute() {
        return Err("File path must be relative to the active workspace.".to_string());
    }
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("Unable to resolve workspace: {error}"))?;
    let candidate = canonical_root
        .join(relative)
        .canonicalize()
        .map_err(|error| format!("Unable to resolve File: {error}"))?;
    if !candidate.starts_with(&canonical_root) {
        return Err("File path leaves the active workspace.".to_string());
    }
    if !candidate.is_file() {
        return Err("The selected path is not a File.".to_string());
    }
    Ok(candidate)
}

fn active_workspace_root(state: &WorkspaceState) -> Result<PathBuf, String> {
    state
        .root
        .read()
        .map_err(|_| "Workspace state is unavailable.".to_string())?
        .clone()
        .ok_or_else(|| "Open a workspace first.".to_string())
}

fn read_file_document(root: &Path, relative_path: &str) -> Result<FileDocument, String> {
    let file_path = resolve_workspace_file(root, relative_path)?;
    let metadata = file_path
        .metadata()
        .map_err(|error| format!("Unable to inspect File: {error}"))?;
    if metadata.len() > MAX_EDITABLE_FILE_BYTES {
        return Err("This File is larger than the 5 MiB editor limit.".to_string());
    }
    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    File::open(&file_path)
        .and_then(|mut file| file.read_to_end(&mut bytes))
        .map_err(|error| format!("Unable to read File: {error}"))?;
    if bytes.contains(&0) {
        return Err("Binary Files cannot be opened in the text editor.".to_string());
    }
    let content = String::from_utf8(bytes.clone())
        .map_err(|_| "This File is not valid UTF-8 text.".to_string())?;
    Ok(FileDocument {
        path: relative_path.to_string(),
        content,
        revision: sha256_hex(&bytes),
    })
}

fn save_file_document(
    root: &Path,
    relative_path: &str,
    content: &str,
    expected_revision: &str,
) -> Result<FileDocument, String> {
    let file_path = resolve_workspace_file(root, relative_path)?;
    let existing = fs::read(&file_path).map_err(|error| format!("Unable to read File: {error}"))?;
    if sha256_hex(&existing) != expected_revision {
        return Err("The File changed outside CodeGraphy. Reopen it before saving.".to_string());
    }
    if content.len() as u64 > MAX_EDITABLE_FILE_BYTES {
        return Err("This File is larger than the 5 MiB editor limit.".to_string());
    }
    let parent = file_path
        .parent()
        .ok_or_else(|| "Unable to resolve the File folder.".to_string())?;
    let permissions = file_path
        .metadata()
        .map_err(|error| format!("Unable to inspect File: {error}"))?
        .permissions();
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|error| format!("Unable to create a safe save File: {error}"))?;
    temporary
        .write_all(content.as_bytes())
        .and_then(|_| temporary.flush())
        .and_then(|_| temporary.as_file().sync_all())
        .map_err(|error| format!("Unable to write File: {error}"))?;
    temporary
        .as_file()
        .set_permissions(permissions)
        .map_err(|error| format!("Unable to preserve File permissions: {error}"))?;
    temporary
        .persist(&file_path)
        .map_err(|error| format!("Unable to replace File safely: {}", error.error))?;
    read_file_document(root, relative_path)
}

fn spawn_core_process(app: &AppHandle) -> Result<CoreProcess, String> {
    let script = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Unable to locate app resources: {error}"))?
        .join("runtime")
        .join("sidecar.mjs");
    let (events, child) = app
        .shell()
        .sidecar("codegraphy-core")
        .map_err(|error| format!("Unable to locate Core service: {error}"))?
        .arg(script)
        .spawn()
        .map_err(|error| format!("Unable to start Core service: {error}"))?;
    Ok(CoreProcess {
        child: Some(child),
        events,
    })
}

fn build_core_request(request_id: u64, action: &CoreRequestAction, workspace_root: &Path) -> Value {
    let mut params = json!({
        "workspaceRoot": workspace_root,
    });
    if let CoreRequestAction::Update { relative_path } = action {
        params["relativePath"] = Value::String(relative_path.clone());
    }
    json!({
        "kind": "request",
        "id": request_id,
        "method": action.method(),
        "params": params,
    })
}

async fn request_core(
    app: &AppHandle,
    service: &CoreService,
    action: &CoreRequestAction,
    workspace_root: &Path,
) -> Result<Value, String> {
    let mut state = service.inner.lock().await;
    state.next_request_id += 1;
    let request_id = state.next_request_id;
    if state.process.is_none() {
        state.process = Some(spawn_core_process(app)?);
    }
    let process = state
        .process
        .as_mut()
        .ok_or_else(|| "Core service is unavailable.".to_string())?;
    let request = build_core_request(request_id, action, workspace_root);
    let mut request_bytes = serde_json::to_vec(&request)
        .map_err(|error| format!("Unable to encode Core request: {error}"))?;
    request_bytes.push(b'\n');
    process
        .child
        .as_mut()
        .ok_or_else(|| "Core service stopped.".to_string())?
        .write(&request_bytes)
        .map_err(|error| format!("Unable to send Core request: {error}"))?;

    while let Some(event) = process.events.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let message: CoreMessage = serde_json::from_slice(&line)
                    .map_err(|error| format!("Core service returned invalid data: {error}"))?;
                match message {
                    CoreMessage::Event { event, mut details } => {
                        details.insert("event".to_string(), Value::String(event));
                        app.emit("core-service-event", details)
                            .map_err(|error| format!("Unable to report Core progress: {error}"))?;
                    }
                    CoreMessage::Response { id, outcome } if id == Some(request_id) => {
                        return match outcome {
                            CoreResponseOutcome::Success { result } => Ok(result),
                            CoreResponseOutcome::Error { error } => Err(error),
                        };
                    }
                    CoreMessage::Response { .. } => {
                        return Err("Core service returned a mismatched response.".to_string());
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                let diagnostic = String::from_utf8_lossy(&line).trim().to_string();
                if !diagnostic.is_empty() {
                    let _ = app.emit("core-service-diagnostic", diagnostic);
                }
            }
            CommandEvent::Error(error) => {
                state.process = None;
                return Err(format!("Core service failed: {error}"));
            }
            CommandEvent::Terminated(terminated) => {
                state.process = None;
                return Err(format!(
                    "Core service stopped with code {:?}.",
                    terminated.code
                ));
            }
            _ => {}
        }
    }
    state.process = None;
    Err("Core service stopped before it returned a response.".to_string())
}

#[tauri::command]
async fn choose_workspace(app: AppHandle) -> Result<Option<String>, String> {
    let selected = app.dialog().file().blocking_pick_folder();
    selected
        .map(|file_path| {
            file_path
                .into_path()
                .map_err(|error| format!("Unable to read selected workspace: {error}"))
                .and_then(|path| canonical_workspace_root(&path))
                .map(|path| path.to_string_lossy().into_owned())
        })
        .transpose()
}

#[tauri::command]
fn initial_workspace() -> Option<String> {
    std::env::var("CODEGRAPHY_DESKTOP_WORKSPACE")
        .ok()
        .filter(|value| !value.is_empty())
}

#[tauri::command]
async fn load_workspace_graph(
    app: AppHandle,
    core: State<'_, CoreService>,
    recents: State<'_, RecentWorkspaceStore>,
    workspace: State<'_, WorkspaceState>,
    workspace_root: String,
    reindex: bool,
    changed_path: Option<String>,
) -> Result<Value, String> {
    let root = canonical_workspace_root(Path::new(&workspace_root))?;
    let action = match (reindex, changed_path) {
        (true, Some(_)) => {
            return Err("A graph request cannot re-index and update one File.".to_string());
        }
        (true, None) => CoreRequestAction::Index,
        (false, Some(relative_path)) => {
            resolve_workspace_file(&root, &relative_path)?;
            CoreRequestAction::Update { relative_path }
        }
        (false, None) => CoreRequestAction::Open,
    };
    let result = request_core(&app, &core, &action, &root).await?;
    {
        let mut active_root = workspace
            .root
            .write()
            .map_err(|_| "Workspace state is unavailable.".to_string())?;
        *active_root = Some(root.clone());
    }
    recents.remember(&root)?;
    refresh_app_menu(&app, &recents)?;
    app.emit(EVENT_RECENT_WORKSPACES_CHANGED, ())
        .map_err(|error| format!("Unable to report recent workspace changes: {error}"))?;
    Ok(result)
}

#[tauri::command]
fn recent_workspaces(
    recents: State<'_, RecentWorkspaceStore>,
) -> Result<Vec<RecentWorkspace>, String> {
    recents.list()
}

#[tauri::command]
fn clear_recent_workspaces(
    app: AppHandle,
    recents: State<'_, RecentWorkspaceStore>,
) -> Result<(), String> {
    recents.clear()?;
    refresh_app_menu(&app, &recents)?;
    app.emit(EVENT_RECENT_WORKSPACES_CHANGED, ())
        .map_err(|error| format!("Unable to report recent workspace changes: {error}"))
}

#[tauri::command]
async fn close_workspace(
    core: State<'_, CoreService>,
    workspace: State<'_, WorkspaceState>,
) -> Result<(), String> {
    {
        let mut active_root = workspace
            .root
            .write()
            .map_err(|_| "Workspace state is unavailable.".to_string())?;
        *active_root = None;
    }
    let process = {
        let mut core_state = core.inner.lock().await;
        core_state.process.take()
    };
    drop(process);
    Ok(())
}

#[tauri::command]
async fn read_workspace_file(
    workspace: State<'_, WorkspaceState>,
    relative_path: String,
) -> Result<FileDocument, String> {
    let root = active_workspace_root(&workspace)?;
    tauri::async_runtime::spawn_blocking(move || read_file_document(&root, &relative_path))
        .await
        .map_err(|error| format!("Unable to read File: {error}"))?
}

#[tauri::command]
async fn save_workspace_file(
    workspace: State<'_, WorkspaceState>,
    relative_path: String,
    content: String,
    expected_revision: String,
) -> Result<FileDocument, String> {
    let root = active_workspace_root(&workspace)?;
    tauri::async_runtime::spawn_blocking(move || {
        save_file_document(&root, &relative_path, &content, &expected_revision)
    })
    .await
    .map_err(|error| format!("Unable to save File: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .enable_macos_default_menu(false)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(CoreService::default())
        .manage(WorkspaceState::default())
        .setup(|app| {
            let recent_workspaces_path = app
                .path()
                .app_config_dir()?
                .join(RECENT_WORKSPACES_FILE_NAME);
            let recents = RecentWorkspaceStore::load(recent_workspaces_path)
                .map_err(std::io::Error::other)?;
            refresh_app_menu(app.handle(), &recents).map_err(std::io::Error::other)?;
            app.manage(recents);
            Ok(())
        })
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .invoke_handler(tauri::generate_handler![
            choose_workspace,
            clear_recent_workspaces,
            close_workspace,
            initial_workspace,
            load_workspace_graph,
            read_workspace_file,
            recent_workspaces,
            save_workspace_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodeGraphy desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_files_outside_the_active_workspace() {
        let workspace = tempfile::tempdir().expect("workspace");
        let outside = tempfile::NamedTempFile::new().expect("outside File");
        let link = workspace.path().join("outside-link.ts");
        std::os::unix::fs::symlink(outside.path(), &link).expect("symlink");

        let result = resolve_workspace_file(workspace.path(), "outside-link.ts");

        assert_eq!(
            result.unwrap_err(),
            "File path leaves the active workspace."
        );
    }

    #[test]
    fn atomic_save_detects_external_changes() {
        let workspace = tempfile::tempdir().expect("workspace");
        let file_path = workspace.path().join("entry.ts");
        fs::write(&file_path, "export const value = 1;\n").expect("write File");
        let opened = read_file_document(workspace.path(), "entry.ts").expect("open File");
        fs::write(&file_path, "export const value = 2;\n").expect("external edit");

        let result = save_file_document(
            workspace.path(),
            "entry.ts",
            "export const value = 3;\n",
            &opened.revision,
        );

        assert_eq!(
            result.unwrap_err(),
            "The File changed outside CodeGraphy. Reopen it before saving."
        );
        assert_eq!(
            fs::read_to_string(file_path).expect("read File"),
            "export const value = 2;\n"
        );
    }

    #[test]
    fn core_request_uses_the_fixed_file_and_folder_sidecar_contract() {
        let request = build_core_request(
            7,
            &CoreRequestAction::Update {
                relative_path: "src/index.ts".to_string(),
            },
            Path::new("/tmp/example"),
        );

        assert_eq!(
            request,
            json!({
                "id": 7,
                "kind": "request",
                "method": "update",
                "params": {
                    "relativePath": "src/index.ts",
                    "workspaceRoot": "/tmp/example",
                },
            })
        );
    }

    #[test]
    fn recent_workspaces_are_canonical_deduplicated_and_bounded() {
        let config = tempfile::tempdir().expect("config folder");
        let workspaces = tempfile::tempdir().expect("workspace parent");
        let file_path = config.path().join(RECENT_WORKSPACES_FILE_NAME);
        let store = RecentWorkspaceStore::load(file_path.clone()).expect("recent workspace store");
        let mut roots = Vec::new();
        for index in 0..=MAX_RECENT_WORKSPACES {
            let root = workspaces.path().join(format!("workspace-{index}"));
            fs::create_dir(&root).expect("create workspace");
            store.remember(&root).expect("remember workspace");
            roots.push(root.canonicalize().expect("canonical workspace"));
        }
        store
            .remember(&roots[4])
            .expect("move existing workspace to front");

        let recent = store.list().expect("list recent workspaces");
        assert_eq!(recent.len(), MAX_RECENT_WORKSPACES);
        assert_eq!(recent[0].path, roots[4].to_string_lossy());
        assert_eq!(recent[1].path, roots[8].to_string_lossy());
        assert_eq!(
            recent
                .iter()
                .filter(|workspace| workspace.path == roots[4].to_string_lossy())
                .count(),
            1
        );
        assert!(recent.iter().all(|workspace| workspace.available));

        let stored: RecentWorkspaceFile = serde_json::from_slice(
            &fs::read(&file_path).expect("read persisted recent workspaces"),
        )
        .expect("parse persisted recent workspaces");
        assert_eq!(stored.paths[0], roots[4]);
        assert_eq!(stored.paths[1], roots[8]);
        assert_eq!(stored.paths.len(), MAX_RECENT_WORKSPACES);

        let reloaded = RecentWorkspaceStore::load(file_path).expect("reload recent workspaces");
        assert_eq!(reloaded.list().expect("list reloaded workspaces"), recent);
    }

    #[test]
    fn missing_recent_workspaces_remain_visible_and_clear_persists() {
        let config = tempfile::tempdir().expect("config folder");
        let workspaces = tempfile::tempdir().expect("workspace parent");
        let file_path = config.path().join(RECENT_WORKSPACES_FILE_NAME);
        let root = workspaces.path().join("moved-workspace");
        fs::create_dir(&root).expect("create workspace");
        let canonical = root.canonicalize().expect("canonical workspace");
        let store = RecentWorkspaceStore::load(file_path.clone()).expect("recent workspace store");
        store.remember(&root).expect("remember workspace");
        fs::remove_dir(&root).expect("remove workspace");

        assert_eq!(
            store.list().expect("list recent workspaces"),
            vec![RecentWorkspace {
                path: canonical.to_string_lossy().into_owned(),
                name: "moved-workspace".to_string(),
                available: false,
            }]
        );

        store.clear().expect("clear recent workspaces");
        let reloaded = RecentWorkspaceStore::load(file_path).expect("reload recent workspaces");
        assert!(reloaded.list().expect("list cleared workspaces").is_empty());
    }
}
