import {accessSync, constants, existsSync, realpathSync} from "node:fs";
import {basename, dirname, isAbsolute, relative, resolve} from "node:path";

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function canonicalRoot(root) {
  const resolved = realpathSync(resolve(root));
  accessSync(resolved, constants.R_OK);
  return resolved;
}

export function canonicalExisting(path) {
  return realpathSync(resolve(path));
}

export function canonicalTarget(path) {
  const absolute = resolve(path);
  if (existsSync(absolute)) return realpathSync(absolute);
  const suffix = [basename(absolute)];
  let parent = dirname(absolute);
  while (!existsSync(parent)) {
    const next = dirname(parent);
    if (next === parent) throw new Error(`target has no existing parent: ${absolute}`);
    suffix.unshift(basename(parent));
    parent = next;
  }
  return resolve(realpathSync(parent), ...suffix);
}

export function requireInside(path, roots, {target = false, label = "path"} = {}) {
  if (!Array.isArray(roots) || roots.length === 0) throw new Error(`${label} requires an authorized root`);
  const candidate = target ? canonicalTarget(path) : canonicalExisting(path);
  const allowed = roots.map(canonicalRoot);
  if (!allowed.some((root) => inside(candidate, root))) {
    throw new Error(`${label} escapes authorized roots: ${candidate}`);
  }
  return candidate;
}

export function samePath(left, right) {
  return resolve(left) === resolve(right);
}
