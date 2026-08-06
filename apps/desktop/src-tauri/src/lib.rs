use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::async_runtime::{Mutex, Receiver};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

const MAX_EDITABLE_FILE_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Default)]
struct WorkspaceState {
    root: RwLock<Option<PathBuf>>,
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

fn build_core_request(
    request_id: u64,
    action: &CoreRequestAction,
    workspace_root: &Path,
    include_symbols: bool,
) -> Value {
    let mut params = json!({
        "workspaceRoot": workspace_root,
        "includeSymbols": include_symbols,
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
    include_symbols: bool,
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
    let request = build_core_request(request_id, action, workspace_root, include_symbols);
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
    workspace: State<'_, WorkspaceState>,
    workspace_root: String,
    reindex: bool,
    include_symbols: bool,
    changed_path: Option<String>,
) -> Result<Value, String> {
    let root = canonical_workspace_root(Path::new(&workspace_root))?;
    {
        let mut active_root = workspace
            .root
            .write()
            .map_err(|_| "Workspace state is unavailable.".to_string())?;
        *active_root = Some(root.clone());
    }
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
    request_core(&app, &core, &action, &root, include_symbols).await
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(CoreService::default())
        .manage(WorkspaceState::default())
        .invoke_handler(tauri::generate_handler![
            choose_workspace,
            initial_workspace,
            load_workspace_graph,
            read_workspace_file,
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
    fn update_request_names_the_saved_file() {
        let request = build_core_request(
            7,
            &CoreRequestAction::Update {
                relative_path: "src/index.ts".to_string(),
            },
            Path::new("/tmp/example"),
            true,
        );

        assert_eq!(request["method"], "update");
        assert_eq!(request["params"]["relativePath"], "src/index.ts");
        assert_eq!(request["params"]["includeSymbols"], true);
    }
}
