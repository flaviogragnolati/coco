import {browserExecutable, mmdcAvailable, mmdcReady, mmdcVersion} from "./renderers/mmdc.mjs";
import {prettyAvailable, prettyVersion} from "./renderers/pretty.mjs";

export function capabilities() {
  const canonicalInstalled = mmdcAvailable();
  const canonical = mmdcReady();
  const pretty = prettyAvailable();
  return {
    node: process.version,
    networkBackend: false,
    canonical: {
      available: canonical,
      installed: canonicalInstalled,
      renderer: "mmdc",
      version: mmdcVersion(),
      browser: browserExecutable(),
      formats: canonical ? ["svg", "png", "pdf"] : []
    },
    pretty: {
      available: pretty,
      renderer: "pretty",
      version: prettyVersion(),
      types: ["flowchart", "sequence", "state", "class", "er", "xychart"],
      formats: pretty ? ["svg", "ascii", "unicode"] : []
    },
    profiles: ["portable", "github", "static-light", "static-dark", "presentation"]
  };
}
