export type Hunk = {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
};

/**
 * Parse a unified diff patch into hunks.
 * Supports the standard `git diff` output format.
 */
export function parsePatch(patch: string): Hunk[] {
  if (!patch) return [];
  const hunks: Hunk[] = [];
  const lines = patch.split("\n");
  let current: Hunk | null = null;
  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (current) hunks.push(current);
      const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (!m) {
        current = { header: line, oldStart: 0, oldLines: 0, newStart: 0, newLines: 0, lines: [] };
        continue;
      }
      current = {
        header: line,
        oldStart: parseInt(m[1], 10),
        oldLines: m[2] ? parseInt(m[2], 10) : 1,
        newStart: parseInt(m[3], 10),
        newLines: m[4] ? parseInt(m[4], 10) : 1,
        lines: [],
      };
    } else if (current) {
      if (line.startsWith("diff --git") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        if (current.lines.length === 0) {
          current.header = current.header;
        }
        continue;
      }
      current.lines.push(line);
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

export function parseHunk(header: string): { oldStart: number; oldLines: number; newStart: number; newLines: number } {
  const m = header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!m) return { oldStart: 0, oldLines: 0, newStart: 0, newLines: 0 };
  return {
    oldStart: parseInt(m[1], 10),
    oldLines: m[2] ? parseInt(m[2], 10) : 1,
    newStart: parseInt(m[3], 10),
    newLines: m[4] ? parseInt(m[4], 10) : 1,
  };
}
