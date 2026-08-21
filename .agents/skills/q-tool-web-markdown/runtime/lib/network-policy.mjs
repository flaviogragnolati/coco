import {createHash} from "node:crypto";
import {lookup as dnsLookup} from "node:dns/promises";
import {isIP} from "node:net";

const FORBIDDEN_SUFFIXES = [
  ".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid", ".example", ".onion"
];
const CREDENTIAL_QUERY_KEY = /(?:^|[-_])(accesstoken|apikey|auth|authorization|credential|jwt|key|password|secret|session|signature|signed|token)(?:$|[-_])/i;

const IPV4_RANGES = [
  ["0.0.0.0", 8, "unspecified"],
  ["10.0.0.0", 8, "private"],
  ["100.64.0.0", 10, "carrier-grade-nat"],
  ["127.0.0.0", 8, "loopback"],
  ["169.254.0.0", 16, "link-local-or-metadata"],
  ["172.16.0.0", 12, "private"],
  ["192.0.0.0", 24, "special-use"],
  ["192.0.2.0", 24, "documentation"],
  ["192.88.99.0", 24, "deprecated-relay"],
  ["192.168.0.0", 16, "private"],
  ["198.18.0.0", 15, "benchmark"],
  ["198.51.100.0", 24, "documentation"],
  ["203.0.113.0", 24, "documentation"],
  ["224.0.0.0", 4, "multicast"],
  ["240.0.0.0", 4, "reserved"]
];

const IPV6_RANGES = [
  ["::", 128, "unspecified"],
  ["::1", 128, "loopback"],
  ["::", 96, "ipv4-compatible"],
  ["64:ff9b::", 96, "nat64"],
  ["64:ff9b:1::", 48, "nat64"],
  ["100::", 64, "discard-only"],
  ["2001::", 23, "ietf-special-use"],
  ["2001:db8::", 32, "documentation"],
  ["2002::", 16, "6to4"],
  ["fc00::", 7, "unique-local"],
  ["fe80::", 10, "link-local"],
  ["ff00::", 8, "multicast"]
];

function ipv4Number(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts.reduce((value, part) => ((value << 8) | part) >>> 0, 0) >>> 0;
}

function ipv4InRange(address, base, prefix) {
  const value = ipv4Number(address);
  const start = ipv4Number(base);
  if (value === null || start === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (start & mask);
}

function expandIpv6(address) {
  let value = address.toLowerCase().split("%")[0];
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = value.slice(lastColon + 1);
    const number = ipv4Number(ipv4);
    if (number === null) return null;
    value = `${value.slice(0, lastColon)}:${((number >>> 16) & 0xffff).toString(16)}:${(number & 0xffff).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - left.length - right.length : 0;
  const parts = [...left, ...Array(fill).fill("0"), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[a-f0-9]{1,4}$/.test(part))) return null;
  return parts.reduce((result, part) => (result << 16n) | BigInt(parseInt(part, 16)), 0n);
}

function ipv6InRange(address, base, prefix) {
  const value = expandIpv6(address);
  const start = expandIpv6(base);
  if (value === null || start === null) return false;
  if (prefix === 0) return true;
  const shift = BigInt(128 - prefix);
  return (value >> shift) === (start >> shift);
}

function mappedIpv4(address) {
  const value = expandIpv6(address);
  if (value === null || (value >> 32n) !== 0xffffn) return null;
  const number = Number(value & 0xffffffffn);
  return [number >>> 24, (number >>> 16) & 255, (number >>> 8) & 255, number & 255].join(".");
}

export function addressDisposition(address) {
  const family = isIP(address);
  if (family === 4) {
    for (const [base, prefix, reason] of IPV4_RANGES) {
      if (ipv4InRange(address, base, prefix)) return {public: false, family, reason};
    }
    return {public: true, family, reason: "public"};
  }
  if (family === 6) {
    const mapped = mappedIpv4(address);
    if (mapped) {
      const mappedDisposition = addressDisposition(mapped);
      return {public: false, family, reason: `ipv4-mapped-${mappedDisposition.reason}`};
    }
    for (const [base, prefix, reason] of IPV6_RANGES) {
      if (ipv6InRange(address, base, prefix)) return {public: false, family, reason};
    }
    return {public: true, family, reason: "public"};
  }
  return {public: false, family: 0, reason: "not-an-ip-address"};
}

export function normalizePublicUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) throw new Error("URL must be a non-empty bounded string");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL is malformed");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("only http:// and https:// URLs are allowed");
  if (url.username || url.password) throw new Error("URL userinfo is not allowed");
  if (isIP(url.hostname)) throw new Error("IP-literal URLs are not allowed");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname.includes(".")) throw new Error("single-label hostnames are not allowed");
  if (FORBIDDEN_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))) {
    throw new Error("local or reserved hostname suffix is not allowed");
  }
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if ((url.protocol === "https:" && port !== "443") || (url.protocol === "http:" && port !== "80")) {
    throw new Error("only default HTTP and HTTPS ports are allowed");
  }
  if ([...url.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEY.test(key))) {
    throw new Error("credential-bearing query parameters are not allowed");
  }
  url.hostname = hostname;
  url.hash = "";
  return url;
}

export async function resolvePublicTarget(hostname, {resolver = dnsLookup} = {}) {
  const answers = await resolver(hostname, {all: true, verbatim: true});
  if (!Array.isArray(answers) || answers.length === 0) throw new Error(`DNS returned no address for ${hostname}`);
  const unique = [];
  for (const answer of answers) {
    const address = typeof answer === "string" ? answer : answer?.address;
    const disposition = addressDisposition(address || "");
    if (!disposition.public) throw new Error(`DNS target is not public (${disposition.reason})`);
    if (!unique.some((item) => item.address === address)) unique.push({address, family: answer.family || disposition.family});
  }
  return unique;
}

export async function authorizeUrl(raw, options = {}) {
  const url = normalizePublicUrl(raw);
  const addresses = await resolvePublicTarget(url.hostname, options);
  return {url, addresses};
}

export function redactUrl(raw) {
  try {
    const url = new URL(raw);
    const query = url.search ? "?[query-redacted]" : "";
    return `${url.protocol}//${url.host}${url.pathname}${query}`;
  } catch {
    return "[invalid-url-redacted]";
  }
}

export function urlFingerprint(raw) {
  return createHash("sha256").update(String(raw)).digest("hex");
}
