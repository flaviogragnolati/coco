import {normalizeSource} from "./normalize.mjs";

export function repairSyntax(source) {
  return normalizeSource(source, {repair: true});
}
