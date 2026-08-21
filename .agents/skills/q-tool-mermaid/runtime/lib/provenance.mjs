import {createHash} from "node:crypto";
import {existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, writeFileSync} from "node:fs";
import {dirname, isAbsolute, join, relative, resolve, sep} from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nearestExisting(path) {
  let cursor = resolve(path);
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return cursor;
}

export function authorizedPath(target, root = process.cwd()) {
  const resolvedRoot = realpathSync(resolve(root));
  const resolvedTarget = isAbsolute(target) ? resolve(target) : resolve(resolvedRoot, target);
  const existing = nearestExisting(resolvedTarget);
  const existingReal = realpathSync(existing);
  const suffix = relative(existing, resolvedTarget);
  const projected = resolve(existingReal, suffix);
  const rel = relative(resolvedRoot, projected);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
    throw new Error(`Path escapes the authorized root: ${target}`);
  }
  if (existsSync(resolvedTarget) && lstatSync(resolvedTarget).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite a symbolic link: ${target}`);
  }
  return resolvedTarget;
}

export function atomicWrite(target, data, {overwrite = false, root = process.cwd()} = {}) {
  const resolved = authorizedPath(target, root);
  if (existsSync(resolved) && !overwrite) throw new Error(`Output exists; pass --overwrite after approval: ${target}`);
  mkdirSync(dirname(resolved), {recursive: true});
  const tempDir = mkdtempSync(join(dirname(resolved), ".q-tool-mermaid-"));
  const staged = join(tempDir, "output");
  try {
    writeFileSync(staged, data);
    renameSync(staged, resolved);
  } finally {
    rmSync(tempDir, {recursive: true, force: true});
  }
  return resolved;
}
