export type DetectInfo = {
  available: boolean;
  version: string;
  initialized: boolean;
};

export type StatusEntry = {
  path: string;
  index_status: string;
  work_status: string;
};

export type YadmStatus = {
  initialized: boolean;
  branch: string | null;
  upstream: string | null;
  clean: boolean;
  staged: StatusEntry[];
  unstaged: StatusEntry[];
  untracked: StatusEntry[];
  conflicted: StatusEntry[];
};

export type LogEntry = {
  hash: string;
  short_hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
  refs: string[];
};

export type RemoteInfo = {
  name: string;
  url: string;
};

export type BranchInfo = {
  name: string;
  current: boolean;
  remote: boolean;
  upstream: string | null;
};

export type DiffResult = {
  path: string;
  old_content: string;
  new_content: string;
  patch: string;
  is_binary: boolean;
};

export type StashEntry = {
  index: number;
  branch: string;
  hash: string;
  subject: string;
  date: string;
};

export type AlternateInfo = {
  source: string;
  link: string;
  valid: boolean;
  class: string | null;
};

export type ConfigEntry = {
  key: string;
  value: string;
  scope: string;
};

export type EncryptedFile = {
  path: string;
  encrypted_path: string;
  size: number;
};

export type EncryptionConfig = {
  program: string;
  recipients: string[];
  openssl_subcommand: string;
  openssl_cipher: string;
};

export type HookInfo = {
  name: string;
  path: string;
  exists: boolean;
  executable: boolean;
};

export type ConflictInfo = {
  path: string;
  ours: string;
  theirs: string;
  base: string;
  merged: string;
};

export type BootstrapResult = {
  success: boolean;
  message: string;
  remote_url: string | null;
};

export type BootstrapInfo = {
  path: string;
  exists: boolean;
  content: string;
};

export type ReadmeInfo = {
  path: string;
  content: string;
};

export type DirEntry = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
};

export type View =
  | "status"
  | "log"
  | "diff"
  | "branches"
  | "stash"
  | "alternates"
  | "encryption"
  | "hooks"
  | "config"
  | "conflicts"
  | "bootstrap"
  | "readme";
