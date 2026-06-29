import { invoke } from "@tauri-apps/api/core";
import type {
  YadmStatus,
  LogEntry,
  RemoteInfo,
  BranchInfo,
  DiffResult,
  StashEntry,
  AlternateInfo,
  ConfigEntry,
  EncryptedFile,
  EncryptionConfig,
  HookInfo,
  ConflictInfo,
  BootstrapResult,
  BootstrapInfo,
  ReadmeInfo,
  DirEntry,
} from "../types/yadm";

type DetectInfo = { available: boolean; version: string; initialized: boolean };

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return (await invoke(cmd, args)) as T;
}

export const yadm = {
  detect: () => call<DetectInfo>("detect_yadm"),
  status: () => call<YadmStatus>("get_status"),
  log: (limit = 100) => call<LogEntry[]>("get_log", { limit }),
  branch: () => call<string>("get_branch"),
  remotes: () => call<RemoteInfo[]>("get_remotes"),
  add: (paths: string[]) => call<void>("add_files", { paths }),
  untrack: (path: string) => call<void>("untrack_file", { path }),
  addAll: () => call<void>("stage_all"),
  unstageAll: () => call<void>("unstage_all"),
  commit: (message: string, sign = false) => call<string>("commit", { message, sign }),
  amend: (message?: string) => call<string>("amend_commit", { message: message ?? null }),
  push: (force = false, setUpstream = false) =>
    call<string>("push", { force, setUpstream }),
  pull: (rebase = false) => call<string>("pull", { rebase }),
  fetch: () => call<string>("fetch"),
  diff: (staged = false) => call<DiffResult[]>("get_diff", { staged }),
  fileDiff: (path: string, staged = false) => call<DiffResult>("get_file_diff", { path, staged }),
  branches: () => call<BranchInfo[]>("list_branches"),
  checkout: (branch: string) => call<void>("checkout_branch", { branch }),
  createBranch: (name: string, checkout = true) =>
    call<void>("create_branch", { name, checkout }),
  stashList: () => call<StashEntry[]>("stash_list"),
  stashSave: (message?: string, includeUntracked = false) =>
    call<void>("stash_save", { message: message ?? null, includeUntracked }),
  stashPop: (index = 0) => call<void>("stash_pop", { index }),
  stashApply: (index = 0) => call<void>("stash_apply", { index }),
  stashDrop: (index = 0) => call<void>("stash_drop", { index }),
  tracked: () => call<string[]>("list_tracked"),
  alternates: () => call<AlternateInfo[]>("list_alternates"),
  addAlternate: (source: string, link: string) =>
    call<void>("add_alternate", { source, link }),
  removeAlternate: (source: string) => call<void>("remove_alternate", { source }),
  config: (scope = "all") => call<ConfigEntry[]>("get_config", { scope }),
  setConfig: (key: string, value: string, scope = "local") =>
    call<void>("set_config", { key, value, scope }),
  unsetConfig: (key: string, scope = "local") =>
    call<void>("unset_config", { key, scope }),
  encrypted: () => call<EncryptedFile[]>("list_encrypted"),
  encrypt: (path: string) => call<void>("encrypt_file", { path }),
  decrypt: (path: string) => call<string>("decrypt_file", { path }),
  encryptionConfig: () => call<EncryptionConfig>("get_encryption_config"),
  setEncryptionConfig: (config: EncryptionConfig) =>
    call<void>("set_encryption_config", { config }),
  hooks: () => call<HookInfo[]>("list_hooks"),
  readHook: (name: string) => call<string>("read_hook", { name }),
  writeHook: (name: string, content: string, executable = true) =>
    call<void>("write_hook", { name, content, executable }),
  deleteHook: (name: string) => call<void>("delete_hook", { name }),
  bootstrapInit: (repoUrl?: string) =>
    call<BootstrapResult>("bootstrap_init", { repoUrl: repoUrl ?? null }),
  bootstrapClone: (url: string, branch?: string) =>
    call<BootstrapResult>("bootstrap_clone", { url, branch: branch ?? null }),
  getBootstrap: () => call<BootstrapInfo>("get_bootstrap"),
  setBootstrap: (content: string) => call<void>("set_bootstrap", { content }),
  runBootstrap: () => call<string>("run_bootstrap"),
  listReadmes: () => call<ReadmeInfo[]>("list_readmes"),
  readReadme: (path: string) => call<string>("read_readme", { path }),
  writeReadme: (path: string, content: string) =>
    call<void>("write_readme", { path, content }),
  conflicts: () => call<ConflictInfo[]>("get_conflicts"),
  resolveConflict: (path: string, resolution: string, stage = true) =>
    call<void>("resolve_conflict", { path, resolution, stage }),
  listDirectory: (path: string) => call<DirEntry[]>("list_directory", { path }),
  pathExists: (path: string) => call<boolean>("path_exists", { path }),
};
