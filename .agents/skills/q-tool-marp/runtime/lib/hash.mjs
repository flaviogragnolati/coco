import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

export function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}
