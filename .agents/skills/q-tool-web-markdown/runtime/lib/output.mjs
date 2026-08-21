import {createHash} from "node:crypto";
import {existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync} from "node:fs";
import {basename, dirname, isAbsolute, relative, resolve, sep} from "node:path";

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function rejectSymlinkComponents(rawRoot, rawTarget) {
  const root = resolve(rawRoot);
  const targetParent = dirname(resolve(rawTarget));
  const rel = relative(root, targetParent);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("output escapes authorized root");
  let current = root;
  if (lstatSync(current).isSymbolicLink()) throw new Error("authorized output root must not be a symbolic link");
  for (const part of rel.split(sep).filter(Boolean)) {
    current = resolve(current, part);
    if (!existsSync(current)) throw new Error("output parent directory must already exist");
    if (lstatSync(current).isSymbolicLink()) throw new Error("output path must not traverse a symbolic link");
  }
}

export function prepareOutput(path, root, {overwrite = false, approvalRef = null} = {}) {
  if (!path || !root) throw new Error("persisted output requires --output and --output-root");
  if (!existsSync(root)) throw new Error("authorized output root does not exist");
  rejectSymlinkComponents(root, path);
  const canonicalRoot = realpathSync(resolve(root));
  const parent = realpathSync(dirname(resolve(path)));
  const target = resolve(parent, basename(path));
  if (!inside(target, canonicalRoot)) throw new Error("output escapes authorized root");
  if (existsSync(target)) {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) throw new Error("output target must not be a symbolic link");
    if (!stat.isFile()) throw new Error("output target must be a regular file");
    if (!overwrite) throw new Error("existing output requires --overwrite");
    if (!approvalRef) throw new Error("overwrite requires --approval-ref");
  }
  if (overwrite && !approvalRef) throw new Error("overwrite requires --approval-ref");
  return target;
}

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function writeAtomicUtf8(target, text) {
  const stage = mkdtempSync(resolve(dirname(target), ".q-tool-web-markdown-"));
  const temporary = resolve(stage, basename(target));
  const backup = resolve(stage, ".previous");
  let movedPrevious = false;
  try {
    writeFileSync(temporary, text, {encoding: "utf8", flag: "wx"});
    const observed = readFileSync(temporary, "utf8");
    if (observed !== text || Buffer.byteLength(observed, "utf8") === 0) throw new Error("staged output verification failed");
    if (existsSync(target)) {
      renameSync(target, backup);
      movedPrevious = true;
    }
    renameSync(temporary, target);
    return {
      path: resolve(target),
      sha256: sha256Text(text),
      bytes: Buffer.byteLength(text, "utf8"),
      characters: text.length
    };
  } catch (error) {
    if (movedPrevious && !existsSync(target) && existsSync(backup)) renameSync(backup, target);
    throw error;
  } finally {
    rmSync(stage, {recursive: true, force: true});
  }
}
