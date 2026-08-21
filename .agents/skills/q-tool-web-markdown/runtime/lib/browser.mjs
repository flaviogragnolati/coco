import {accessSync, constants, mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {delimiter, join, resolve} from "node:path";
import {spawn, spawnSync} from "node:child_process";
import {authorizeUrl} from "./network-policy.mjs";
import {buildExtractionExpression, validateExtracted} from "./extract.mjs";

const BROWSER_NAMES = [
  "google-chrome-stable", "google-chrome", "chromium", "chromium-browser",
  "microsoft-edge-stable", "microsoft-edge", "msedge"
];

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function pathExecutable(name, pathValue = process.env.PATH || "") {
  const extensions = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  for (const part of pathValue.split(delimiter)) {
    if (!part) continue;
    for (const extension of extensions) {
      const candidate = resolve(part, `${name}${extension.toLowerCase()}`);
      if (executable(candidate)) return candidate;
    }
  }
  return null;
}

function versionFor(path) {
  const scratch = mkdtempSync(join(tmpdir(), "q-tool-web-markdown-version-"));
  try {
    const run = spawnSync(path, ["--version"], {encoding: "utf8", timeout: 5000, env: scrubbedEnvironment(process.env, scratch)});
    if (run.status !== 0) return null;
    const version = `${run.stdout || ""}${run.stderr || ""}`.trim();
    return /(?:Chrome|Chromium|Edge)/i.test(version) ? version : null;
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
}

export function discoverBrowser({pathValue = process.env.PATH || "", candidates = BROWSER_NAMES} = {}) {
  for (const name of candidates) {
    const path = name.includes("/") || name.includes("\\") ? resolve(name) : pathExecutable(name, pathValue);
    if (!path) continue;
    const version = versionFor(path);
    if (version) return {path, version, kind: /edge/i.test(version) ? "edge" : /chromium/i.test(version) ? "chromium" : "chrome"};
  }
  return null;
}

export function scrubbedEnvironment(source = process.env, scratch = tmpdir()) {
  const allowed = ["PATH", "SystemRoot", "WINDIR", "LANG", "LC_ALL", "TZ"];
  const env = Object.fromEntries(allowed.filter((name) => source[name]).map((name) => [name, source[name]]));
  env.TMPDIR = scratch;
  env.TMP = scratch;
  env.TEMP = scratch;
  env.XDG_CONFIG_HOME = scratch;
  env.XDG_CACHE_HOME = scratch;
  env.NO_UPDATE_NOTIFIER = "1";
  return env;
}

export function buildBrowserArgs(proxyPort, profilePath) {
  return [
    "--headless=new",
    "--enable-automation",
    "--remote-debugging-pipe",
    `--user-data-dir=${profilePath}`,
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    "--proxy-bypass-list=<-loopback>",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    "--disable-background-networking",
    "--disable-breakpad",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-domain-reliability",
    "--disable-extensions",
    "--disable-features=AutofillServerCommunication,MediaRouter,OptimizationHints,OptimizationGuideModelDownloading,Translate",
    "--disable-gpu",
    "--disable-quic",
    "--disable-sync",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--metrics-recording-only",
    "--no-default-browser-check",
    "--no-first-run",
    "--no-referrers",
    "--password-store=basic",
    "--safebrowsing-disable-auto-update",
    "about:blank"
  ];
}

export function sanitizedBrowserHeaders(headers = {}) {
  const blocked = new Set(["authorization", "cookie", "host", "proxy-authorization", "proxy-connection", "referer"]);
  return Object.entries(headers)
    .filter(([name, value]) => !blocked.has(name.toLowerCase()) && value !== undefined)
    .map(([name, value]) => ({name, value: String(value)}));
}

class CdpPipe {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.buffer = "";
    const reader = child.stdio[4];
    const writer = child.stdio[3];
    if (!reader || !writer) throw new Error("browser DevTools pipe is unavailable");
    this.reader = reader;
    this.writer = writer;
    reader.setEncoding("utf8");
    reader.on("data", (chunk) => this.#consume(chunk));
    child.once("exit", (code, signal) => {
      const error = new Error(`browser exited before completion (${code ?? signal ?? "unknown"})`);
      for (const {reject, timer} of this.pending.values()) {
        clearTimeout(timer);
        reject(error);
      }
      this.pending.clear();
    });
  }

  #consume(chunk) {
    this.buffer += chunk;
    while (this.buffer.includes("\0")) {
      const index = this.buffer.indexOf("\0");
      const raw = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 1);
      if (!raw) continue;
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        continue;
      }
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message || "DevTools command failed"));
        else pending.resolve(message.result || {});
        continue;
      }
      const callbacks = this.listeners.get(message.method) || [];
      for (const callback of callbacks) callback(message.params || {}, message.sessionId || null);
    }
  }

  send(method, params = {}, sessionId = null, timeoutMs = 10000) {
    const id = this.nextId++;
    const message = {id, method, params};
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools command timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {resolve: resolvePromise, reject, timer});
      this.writer.write(`${JSON.stringify(message)}\0`);
    });
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
    return () => this.listeners.set(method, (this.listeners.get(method) || []).filter((item) => item !== callback));
  }
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function nodeSupported() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

export class BrowserCaptureError extends Error {
  constructor(category, message) {
    super(message);
    this.category = category;
  }
}

export async function launchBrowser({browser, proxyPort, timeoutMs = 10000} = {}) {
  if (!nodeSupported()) throw new BrowserCaptureError("capability", "Node 22.12 or newer is required");
  const selected = browser || discoverBrowser();
  if (!selected) throw new BrowserCaptureError("capability", "no supported sandbox-capable Chrome, Chromium, or Edge executable was found");
  const profile = mkdtempSync(join(tmpdir(), "q-tool-web-markdown-browser-"));
  const args = buildBrowserArgs(proxyPort, profile);
  const child = spawn(selected.path, args, {
    stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
    env: scrubbedEnvironment(process.env, profile)
  });
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-4096); });
  const cdp = new CdpPipe(child);
  try {
    const version = await cdp.send("Browser.getVersion", {}, null, timeoutMs);
    const commandLine = await cdp.send("Browser.getBrowserCommandLine", {}, null, timeoutMs);
    const argumentsUsed = commandLine.arguments || [];
    if (argumentsUsed.some((argument) => argument === "--no-sandbox" || argument.startsWith("--no-sandbox="))) {
      throw new BrowserCaptureError("capability", "browser sandbox is disabled");
    }
    return {
      browser: {
        kind: selected.kind,
        version: selected.version,
        product: version.product || selected.version,
        protocol_version: version.protocolVersion || null,
        sandbox: "verified"
      },
      cdp,
      child,
      profile,
      async close() {
        try { await cdp.send("Browser.close", {}, null, 2000); } catch {}
        await Promise.race([
          new Promise((resolvePromise) => child.once("exit", resolvePromise)),
          delay(2000).then(() => { if (!child.killed) child.kill("SIGKILL"); })
        ]);
        rmSync(profile, {recursive: true, force: true});
      }
    };
  } catch (error) {
    if (!child.killed) child.kill("SIGKILL");
    rmSync(profile, {recursive: true, force: true});
    const suffix = stderr.trim() ? `: ${stderr.trim().split(/\r?\n/).slice(-1)[0]}` : "";
    if (error instanceof BrowserCaptureError) throw error;
    throw new BrowserCaptureError("capability", `${error.message}${suffix}`);
  }
}

async function waitForIdle(state, deadline) {
  while (Date.now() < deadline) {
    if (state.fatal) throw state.fatal;
    if (state.activeRequests.size === 0 && Date.now() - state.lastActivity >= 600) return;
    await delay(50);
  }
  throw new BrowserCaptureError("limit", "network idle timeout exceeded");
}

export async function capturePage(url, {
  browser,
  proxy,
  resolver,
  limits
}) {
  const launched = await launchBrowser({browser, proxyPort: proxy.port, timeoutMs: Math.min(limits.timeout_ms, 10000)});
  const {cdp} = launched;
  const state = {
    requests: 0,
    redirects: 0,
    bytes: 0,
    activeRequests: new Set(),
    lastActivity: Date.now(),
    document_status: null,
    document_url: null,
    main_frame_id: null,
    fatal: null,
    tasks: new Set()
  };
  const fail = (category, message) => {
    if (!state.fatal) state.fatal = new BrowserCaptureError(category, message);
  };
  let targetId;
  let sessionId;
  try {
    ({targetId} = await cdp.send("Target.createTarget", {url: "about:blank"}));
    ({sessionId} = await cdp.send("Target.attachToTarget", {targetId, flatten: true}));
    cdp.on("Target.targetCreated", (params) => {
      const info = params.targetInfo || {};
      if (info.type === "page" && info.targetId !== targetId && info.url !== "about:blank") {
        fail("network-policy", "popup creation was blocked");
        cdp.send("Target.closeTarget", {targetId: info.targetId}).catch(() => {});
      }
    });
    cdp.on("Network.requestWillBeSent", (params, eventSession) => {
      if (eventSession !== sessionId) return;
      state.activeRequests.add(params.requestId);
      state.lastActivity = Date.now();
      if (params.redirectResponse) {
        state.redirects += 1;
        if (state.redirects > limits.max_redirects) fail("limit", "redirect limit exceeded");
      }
    });
    const finishRequest = (params, eventSession) => {
      if (eventSession !== sessionId) return;
      state.activeRequests.delete(params.requestId);
      state.lastActivity = Date.now();
    };
    cdp.on("Network.loadingFinished", finishRequest);
    cdp.on("Network.loadingFailed", finishRequest);
    cdp.on("Network.dataReceived", (params, eventSession) => {
      if (eventSession !== sessionId) return;
      state.bytes += params.dataLength || 0;
      if (state.bytes > limits.max_bytes) fail("limit", "response byte limit exceeded");
    });
    cdp.on("Network.responseReceived", (params, eventSession) => {
      if (
        eventSession !== sessionId
        || params.type !== "Document"
        || (state.main_frame_id && params.frameId !== state.main_frame_id)
      ) return;
      state.document_status = params.response?.status ?? null;
      state.document_url = params.response?.url ?? null;
    });
    cdp.on("Network.webSocketCreated", (_params, eventSession) => {
      if (eventSession === sessionId) fail("network-policy", "WebSocket creation was blocked");
    });
    cdp.on("Browser.downloadWillBegin", () => fail("network-policy", "download creation was blocked"));
    cdp.on("Fetch.requestPaused", (params, eventSession) => {
      if (eventSession !== sessionId) return;
      const task = (async () => {
        state.requests += 1;
        if (state.requests > limits.max_requests) {
          fail("limit", "request limit exceeded");
          await cdp.send("Fetch.failRequest", {requestId: params.requestId, errorReason: "BlockedByClient"}, sessionId);
          return;
        }
        const method = params.request?.method || "";
        const rawUrl = params.request?.url || "";
        let parsed;
        try { parsed = new URL(rawUrl); } catch {
          fail("network-policy", "malformed browser request was blocked");
          await cdp.send("Fetch.failRequest", {requestId: params.requestId, errorReason: "BlockedByClient"}, sessionId);
          return;
        }
        if (["data:", "blob:", "about:"].includes(parsed.protocol)) {
          await cdp.send("Fetch.continueRequest", {
            requestId: params.requestId,
            headers: sanitizedBrowserHeaders(params.request?.headers)
          }, sessionId);
          return;
        }
        if (!new Set(["http:", "https:"]).has(parsed.protocol) || !new Set(["GET", "HEAD"]).has(method)) {
          fail("network-policy", `browser request was blocked (${method} ${parsed.protocol})`);
          await cdp.send("Fetch.failRequest", {requestId: params.requestId, errorReason: "BlockedByClient"}, sessionId);
          return;
        }
        try {
          await authorizeUrl(rawUrl, {resolver});
          await cdp.send("Fetch.continueRequest", {
            requestId: params.requestId,
            headers: sanitizedBrowserHeaders(params.request?.headers)
          }, sessionId);
        } catch (error) {
          fail("network-policy", `browser request target was blocked: ${error.message}`);
          await cdp.send("Fetch.failRequest", {requestId: params.requestId, errorReason: "BlockedByClient"}, sessionId);
        }
      })().catch((error) => fail("internal", `request interception failed: ${error.message}`));
      state.tasks.add(task);
      task.finally(() => state.tasks.delete(task));
    });

    await cdp.send("Target.setDiscoverTargets", {discover: true});
    await cdp.send("Browser.setDownloadBehavior", {behavior: "deny", eventsEnabled: true});
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Network.enable", {maxTotalBufferSize: Math.min(limits.max_bytes, 10 * 1024 * 1024)}, sessionId);
    await cdp.send("Network.setCacheDisabled", {cacheDisabled: true}, sessionId);
    await cdp.send("Network.clearBrowserCache", {}, sessionId);
    await cdp.send("Network.clearBrowserCookies", {}, sessionId);
    await cdp.send("Network.setBypassServiceWorker", {bypass: true}, sessionId);
    await cdp.send("Network.setBlockedURLs", {urls: ["ws://*", "wss://*", "file://*", "ftp://*"]}, sessionId);
    await cdp.send("Fetch.enable", {patterns: [{urlPattern: "*", requestStage: "Request"}]}, sessionId);
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `for (const [key, value] of [["open", () => null], ["RTCPeerConnection", undefined], ["webkitRTCPeerConnection", undefined]]) { try { Object.defineProperty(window, key, {value}); } catch {} }\ntry { if (navigator.serviceWorker) Object.defineProperty(navigator, "serviceWorker", {value: undefined}); } catch {}`
    }, sessionId);

    const deadline = Date.now() + limits.timeout_ms;
    let loadFired = false;
    const stopLoadListener = cdp.on("Page.loadEventFired", (_params, eventSession) => {
      if (eventSession === sessionId) loadFired = true;
    });
    const navigation = await cdp.send("Page.navigate", {url: String(url)}, sessionId, limits.timeout_ms);
    if (navigation.errorText) throw new BrowserCaptureError("navigation", `navigation failed: ${navigation.errorText}`);
    state.main_frame_id = navigation.frameId || state.main_frame_id;
    while (!loadFired && Date.now() < deadline) {
      if (state.fatal) throw state.fatal;
      await delay(25);
    }
    stopLoadListener();
    if (!loadFired) throw new BrowserCaptureError("limit", "page load timeout exceeded");
    await Promise.allSettled([...state.tasks]);
    if (state.fatal) throw state.fatal;
    await waitForIdle(state, deadline);

    await cdp.send("Runtime.evaluate", {
      expression: `(async () => { const root = document.scrollingElement || document.documentElement; const step = Math.max(400, Math.floor(innerHeight * 0.8)); for (let i = 0; i < 8 && root.scrollTop + innerHeight < root.scrollHeight; i += 1) { root.scrollTo(0, Math.min(root.scrollHeight, root.scrollTop + step)); await new Promise(r => setTimeout(r, 180)); } root.scrollTo(0, 0); return true; })()`,
      awaitPromise: true,
      returnByValue: true
    }, sessionId, Math.max(1000, deadline - Date.now()));
    await waitForIdle(state, deadline);
    await Promise.allSettled([...state.tasks]);
    if (state.fatal) throw state.fatal;

    const domSize = await cdp.send("Runtime.evaluate", {
      expression: `new TextEncoder().encode(document.documentElement?.outerHTML || "").byteLength`,
      returnByValue: true
    }, sessionId, Math.max(1000, deadline - Date.now()));
    if (!Number.isFinite(domSize.result?.value) || domSize.result.value > limits.max_dom_bytes) {
      throw new BrowserCaptureError("limit", "DOM byte limit exceeded");
    }

    const evaluated = await cdp.send("Runtime.evaluate", {
      expression: buildExtractionExpression(),
      returnByValue: true,
      awaitPromise: true
    }, sessionId, Math.max(1000, deadline - Date.now()));
    if (evaluated.exceptionDetails) throw new BrowserCaptureError("extraction", "page extraction raised an exception");
    const extracted = evaluated.result?.value;
    if (!extracted || typeof extracted !== "object") throw new BrowserCaptureError("extraction", "page extraction returned no result");
    if (Buffer.byteLength(String(extracted.markdown || ""), "utf8") > limits.max_markdown_bytes) {
      throw new BrowserCaptureError("limit", "Markdown byte limit exceeded");
    }
    await authorizeUrl(extracted.final_url, {resolver});
    const quality = validateExtracted(extracted, state.document_status);
    if (!quality.valid) throw new BrowserCaptureError(quality.category, quality.errors.join("; "));
    return {
      extracted,
      quality,
      metrics: {
        requests: state.requests,
        redirects: state.redirects,
        response_bytes: state.bytes,
        document_status: state.document_status,
        proxy_connections: proxy.metrics.connections,
        proxy_bytes_from_remote: proxy.metrics.bytes_from_remote,
        proxy_bytes_to_remote: proxy.metrics.bytes_to_remote
      },
      browser: launched.browser
    };
  } finally {
    await launched.close();
  }
}

export async function doctorBrowser({browser, proxy} = {}) {
  const launched = await launchBrowser({browser, proxyPort: proxy.port});
  try {
    return launched.browser;
  } finally {
    await launched.close();
  }
}
