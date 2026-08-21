import http from "node:http";
import net from "node:net";
import {authorizeUrl, normalizePublicUrl, resolvePublicTarget} from "./network-policy.mjs";

const DROP_REQUEST_HEADERS = new Set([
  "authorization", "content-length", "cookie", "proxy-authorization", "proxy-connection", "connection", "transfer-encoding", "upgrade"
]);
const DROP_RESPONSE_HEADERS = new Set(["set-cookie", "connection", "proxy-authenticate", "upgrade"]);

function filteredHeaders(headers, dropped) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name, value]) => !dropped.has(name.toLowerCase()) && value !== undefined)
  );
}

export async function connectPinned(hostname, port, {
  resolver,
  connector = (options) => net.connect(options),
  timeoutMs = 10000
} = {}) {
  const addresses = await resolvePublicTarget(hostname, {resolver});
  const selected = addresses[0];
  return await new Promise((resolve, reject) => {
    const socket = connector({host: selected.address, port, family: selected.family});
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("pinned connection timed out"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve({socket, selected, addresses});
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function parseConnectAuthority(authority) {
  if (typeof authority !== "string" || authority.includes("@")) throw new Error("invalid CONNECT authority");
  try {
    const url = normalizePublicUrl(`https://${authority}/`);
    if ((url.port || "443") !== "443") throw new Error("CONNECT allows only HTTPS port 443");
    return url;
  } catch {
    throw new Error("invalid CONNECT authority");
  }
}

export async function startEgressProxy({
  resolver,
  connector,
  maxConnections = 200,
  maxBytes = 20 * 1024 * 1024,
  onBlock = () => {}
} = {}) {
  const metrics = {connections: 0, bytes_from_remote: 0, bytes_to_remote: 0, blocked: []};
  const sockets = new Set();
  const block = (reason) => {
    metrics.blocked.push(reason);
    onBlock(reason);
  };

  const server = http.createServer(async (request, response) => {
    try {
      metrics.connections += 1;
      if (metrics.connections > maxConnections) throw new Error("network connection limit exceeded");
      if (!new Set(["GET", "HEAD"]).has(request.method || "")) throw new Error("only GET and HEAD are allowed");
      if (request.headers["transfer-encoding"] || Number(request.headers["content-length"] || 0) > 0) {
        throw new Error("request bodies are not allowed");
      }
      const {url, addresses} = await authorizeUrl(request.url, {resolver});
      const selected = addresses[0];
      const headers = filteredHeaders(request.headers, DROP_REQUEST_HEADERS);
      headers.host = url.host;
      const upstream = http.request({
        host: selected.address,
        family: selected.family,
        port: 80,
        method: request.method,
        path: `${url.pathname}${url.search}`,
        headers,
        agent: false
      });
      upstream.once("response", (incoming) => {
        response.writeHead(incoming.statusCode || 502, filteredHeaders(incoming.headers, DROP_RESPONSE_HEADERS));
        incoming.on("data", (chunk) => {
          metrics.bytes_from_remote += chunk.length;
          if (metrics.bytes_from_remote > maxBytes) {
            block("network byte limit exceeded");
            incoming.destroy();
            upstream.destroy();
            response.destroy();
          }
        });
        incoming.pipe(response);
      });
      upstream.once("error", (error) => {
        if (!response.headersSent) response.writeHead(502, {"content-type": "text/plain"});
        response.end("blocked upstream failure");
        block(`HTTP proxy failure: ${error.message}`);
      });
      upstream.setTimeout(10000, () => upstream.destroy(new Error("HTTP upstream timed out")));
      request.on("data", (chunk) => {
        metrics.bytes_to_remote += chunk.length;
        if (metrics.bytes_to_remote > maxBytes) upstream.destroy(new Error("network byte limit exceeded"));
      });
      request.pipe(upstream);
    } catch (error) {
      block(`HTTP request blocked: ${error.message}`);
      response.writeHead(403, {"content-type": "text/plain", connection: "close"});
      response.end("blocked by q-tool-web-markdown policy");
    }
  });

  server.on("connect", async (request, clientSocket, head) => {
    let remote;
    try {
      metrics.connections += 1;
      if (metrics.connections > maxConnections) throw new Error("network connection limit exceeded");
      const url = parseConnectAuthority(request.url);
      const pinned = await connectPinned(url.hostname, 443, {resolver, connector});
      remote = pinned.socket;
      sockets.add(remote);
      remote.once("close", () => sockets.delete(remote));
      clientSocket.write("HTTP/1.1 200 Connection Established\r\nProxy-Agent: q-tool-web-markdown\r\n\r\n");
      if (head?.length) remote.write(head);
      remote.on("data", (chunk) => {
        metrics.bytes_from_remote += chunk.length;
        if (metrics.bytes_from_remote > maxBytes) {
          block("network byte limit exceeded");
          remote.destroy();
          clientSocket.destroy();
        }
      });
      clientSocket.on("data", (chunk) => {
        metrics.bytes_to_remote += chunk.length;
        if (metrics.bytes_to_remote > maxBytes) {
          block("network byte limit exceeded");
          remote.destroy();
          clientSocket.destroy();
        }
      });
      clientSocket.pipe(remote);
      remote.pipe(clientSocket);
      const closeBoth = () => {
        if (!clientSocket.destroyed) clientSocket.destroy();
        if (remote && !remote.destroyed) remote.destroy();
      };
      clientSocket.once("error", closeBoth);
      remote.once("error", closeBoth);
    } catch (error) {
      block(`CONNECT blocked: ${error.message}`);
      clientSocket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      clientSocket.destroy();
      if (remote && !remote.destroyed) remote.destroy();
    }
  });

  server.on("clientError", (error, socket) => {
    block(`proxy client error: ${error.message}`);
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("egress proxy did not bind a TCP port");

  return {
    host: "127.0.0.1",
    port: address.port,
    metrics,
    close: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy();
      server.closeAllConnections?.();
      server.close(() => resolve());
    })
  };
}
