import dns from "node:dns/promises";
import net from "node:net";
import { createServer, type Server, type Socket } from "node:net";

function ipv4Private(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113);
}

function ipv6Words(ip: string): number[] | null {
  if (ip.includes("%")) return null;
  let source = ip.toLowerCase();
  const dotted = source.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    if (net.isIP(dotted[1]) !== 4) return null;
    const bytes = dotted[1].split(".").map(Number);
    source = source.slice(0, -dotted[1].length) + `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const parts = source.split("::");
  if (parts.length > 2) return null;
  const parse = (side: string) => side ? side.split(":").map(word => /^[0-9a-f]{1,4}$/.test(word) ? parseInt(word, 16) : Number.NaN) : [];
  const left = parse(parts[0]);
  const right = parse(parts[1] ?? "");
  if ([...left, ...right].some(word => !Number.isFinite(word))) return null;
  if (parts.length === 1) return left.length === 8 ? left : null;
  const zeroCount = 8 - left.length - right.length;
  if (zeroCount < 1) return null;
  return [...left, ...Array(zeroCount).fill(0), ...right];
}

function ipv6Private(ip: string): boolean {
  const words = ipv6Words(ip);
  if (!words) return true;
  const allZero = words.every(word => word === 0);
  const loopback = words.slice(0, 7).every(word => word === 0) && words[7] === 1;
  if (allZero || loopback) return true;

  const mapped = words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff;
  if (mapped) return ipv4Private(`${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`);
  // IPv4-compatible, unique-local, link-local, multicast, documentation,
  // transition, and non-global-unicast IPv6 addresses are not destinations.
  if (words.slice(0, 6).every(word => word === 0)) return true;
  const first = words[0];
  const second = words[1];
  return (first & 0xe000) !== 0x2000 || // only global-unicast 2000::/3
    first === 0x2002 || // 6to4 embeds an IPv4 destination
    first === 0x3fff || // documentation prefix
    (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)); // special-use and documentation
}

export function isPublicAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return !ipv4Private(ip);
  if (family === 6) return !ipv6Private(ip);
  return false;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })])
    .finally(() => { if (timer) clearTimeout(timer); });
}

export async function resolvePublic(host: string): Promise<Array<{ address: string; family: number }>> {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (net.isIP(normalized)) {
    if (!isPublicAddress(normalized)) throw new Error("Destination is not public");
    return [{ address: normalized, family: net.isIP(normalized) }];
  }
  if (normalized === "localhost" || [".localhost", ".local", ".internal", ".test", ".invalid"].some(suffix => normalized.endsWith(suffix))) throw new Error("Local destination blocked");
  const rows = await withTimeout(dns.lookup(normalized, { all: true, verbatim: true }), 4_000, "Public destination DNS check timed out");
  if (!rows.length || rows.some(row => !isPublicAddress(row.address))) throw new Error("Destination resolved to a non-public address");
  return rows;
}

function write(socket: Socket, text: string) { socket.write(text, "latin1"); }

function parseConnectTarget(line: string): string | null {
  const request = line.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
  if (!request) return null;
  const authority = request[1];
  let host = "";
  let port = "";
  if (authority.startsWith("[")) {
    const close = authority.indexOf("]");
    if (close < 0 || authority[close + 1] !== ":") return null;
    host = authority.slice(1, close);
    port = authority.slice(close + 2);
  } else {
    const colon = authority.lastIndexOf(":");
    if (colon < 1 || authority.slice(0, colon).includes(":")) return null;
    host = authority.slice(0, colon);
    port = authority.slice(colon + 1);
  }
  return port === "443" && host && !/[\s\/@\\]/.test(host) ? host : null;
}

const MAX_SOCKETS = 64;
const HEADER_TIMEOUT_MS = 8_000;
const CONNECT_TIMEOUT_MS = 5_000;

/** Local HTTPS CONNECT proxy with public-DNS validation and IP-pinned tunnels. */
export async function startPublicNetworkProxy(): Promise<{ url: string; close: () => Promise<void> }> {
  const sockets = new Set<Socket>();
  let server: Server;
  let closed = false;
  server = createServer(client => {
    if (sockets.size >= MAX_SOCKETS) {
      write(client, "HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
      client.destroy();
      return;
    }
    sockets.add(client);
    client.once("close", () => sockets.delete(client));
    client.once("error", () => client.destroy());
    client.setTimeout(HEADER_TIMEOUT_MS, () => client.destroy());
    const absoluteHeaderTimer = setTimeout(() => client.destroy(), HEADER_TIMEOUT_MS);
    client.once("close", () => clearTimeout(absoluteHeaderTimer));
    let header = "";
    let handling = false;
    const onData = async (chunk: Buffer) => {
      if (handling) return;
      header += chunk.toString("latin1");
      if (header.length > 16_384) { client.destroy(); return; }
      const end = header.indexOf("\r\n\r\n");
      if (end < 0) return;
      clearTimeout(absoluteHeaderTimer);
      client.setTimeout(CONNECT_TIMEOUT_MS + 5_000, () => client.destroy());
      handling = true;
      client.off("data", onData);
      try {
        const host = parseConnectTarget(header.slice(0, end).split("\r\n", 1)[0]);
        if (!host) throw new Error("Only HTTPS CONNECT to port 443 is allowed");
        const addresses = await resolvePublic(host);
        if (client.destroyed) return;
        const target = addresses[0];
        const upstream = net.connect({ host: target.address, family: target.family, port: 443 });
        if (sockets.size >= MAX_SOCKETS) { upstream.destroy(); throw new Error("Proxy connection limit reached"); }
        sockets.add(upstream);
        upstream.once("close", () => sockets.delete(upstream));
        client.once("close", () => upstream.destroy());
        upstream.setTimeout(CONNECT_TIMEOUT_MS, () => upstream.destroy(new Error("Public destination connect timed out")));
        upstream.once("connect", () => {
          upstream.setTimeout(0);
          client.setTimeout(0);
          write(client, "HTTP/1.1 200 Connection Established\r\n\r\n");
          const rest = header.slice(end + 4);
          if (rest) upstream.write(Buffer.from(rest, "latin1"));
          client.pipe(upstream); upstream.pipe(client);
        });
        upstream.once("error", () => client.destroy());
      } catch {
        if (client.destroyed) return;
        write(client, "HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        client.end();
      }
    };
    client.on("data", onData);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start research proxy");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      if (closed) return;
      closed = true;
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
