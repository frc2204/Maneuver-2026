import { existsSync, statSync } from "fs";
import { join, extname } from "path";

// ── Configuration ──────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = join(import.meta.dir, "..", "dist");

// ── MIME types for static file serving ─────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

// ── API Proxy (replaces netlify/functions/api-proxy.ts) ────────────────────────

type Provider = "tba" | "nexus";

const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
const NEXUS_BASE_URL = "https://frc.nexus/api/v1";

const tbaAllowed = [
  /^\/events\/\d+(?:\/simple)?$/,
  /^\/event\/[a-z0-9]+\/matches(?:\/simple)?$/i,
  /^\/event\/[a-z0-9]+\/teams\/keys$/i,
  /^\/match\/[a-z0-9_]+$/i,
];

const nexusAllowed = [
  /^\/events$/,
  /^\/event\/[a-z0-9]+$/i,
  /^\/event\/[a-z0-9]+\/pits$/i,
  /^\/event\/[a-z0-9]+\/map$/i,
];

function isAllowedEndpoint(provider: Provider, endpoint: string): boolean {
  const rules = provider === "tba" ? tbaAllowed : nexusAllowed;
  return rules.some((rule) => rule.test(endpoint));
}

function getServerApiKey(provider: Provider): string | undefined {
  if (provider === "tba") {
    return (
      process.env.TBA_API_KEY ||
      process.env.TBA_AUTH_KEY ||
      process.env.VITE_TBA_API_KEY
    );
  }
  return (
    process.env.NEXUS_API_KEY ||
    process.env.NEXUS_AUTH_KEY ||
    process.env.VITE_NEXUS_API_KEY
  );
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Client-Api-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function handleApiProxy(req: Request): Promise<Response> {
  const headers = {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
    "Cache-Control":
      "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
    Vary: "X-Client-Api-Key",
  };

  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  try {
    const url = new URL(req.url);
    const provider = (url.searchParams.get("provider") || "").toLowerCase() as Provider;
    const endpoint = url.searchParams.get("endpoint") || "";

    if (provider !== "tba" && provider !== "nexus") {
      return Response.json({ error: "Invalid provider" }, { status: 400, headers });
    }

    if (!endpoint.startsWith("/") || !isAllowedEndpoint(provider, endpoint)) {
      return Response.json({ error: "Endpoint not allowed" }, { status: 400, headers });
    }

    const overrideKey =
      req.headers.get("x-client-api-key") ||
      req.headers.get("X-Client-Api-Key");
    const apiKey = overrideKey || getServerApiKey(provider);

    if (!apiKey) {
      return Response.json(
        {
          error: `${provider.toUpperCase()} API key not configured. Set ${
            provider === "tba"
              ? "TBA_API_KEY or TBA_AUTH_KEY"
              : "NEXUS_API_KEY or NEXUS_AUTH_KEY"
          }`,
        },
        { status: 500, headers }
      );
    }

    const baseUrl = provider === "tba" ? TBA_BASE_URL : NEXUS_BASE_URL;
    const upstreamHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(provider === "tba"
        ? { "X-TBA-Auth-Key": apiKey }
        : { "Nexus-Api-Key": apiKey }),
    };

    const upstreamResponse = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: upstreamHeaders,
    });

    const text = await upstreamResponse.text();
    const upstreamCacheControl = upstreamResponse.headers.get("cache-control");

    return new Response(text || JSON.stringify({}), {
      status: upstreamResponse.status,
      headers: {
        ...headers,
        ...(upstreamCacheControl ? { "Cache-Control": upstreamCacheControl } : {}),
      },
    });
  } catch (error) {
    console.error("api-proxy error", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500, headers }
    );
  }
}

// ── WebRTC Signaling (replaces netlify/functions/webrtc-signal.ts) ─────────────

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "join" | "leave" | "ping";
  roomId?: string;
  peerId?: string;
  peerName?: string;
  role?: "lead" | "scout";
  targetPeerId?: string;
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
  deliveredTo?: Set<string>;
}

interface Room {
  id: string;
  lead?: { id: string; name: string; lastSeen: number };
  scouts: Map<string, { id: string; name: string; lastSeen: number }>;
  messages: SignalingMessage[];
  createdAt: number;
}

const rooms = new Map<string, Room>();

// Clean up old rooms every 30 minutes
const ROOM_TIMEOUT = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TIMEOUT) {
      rooms.delete(roomId);
      console.log(`Cleaned up room: ${roomId}`);
    }
  }
}, ROOM_TIMEOUT);

async function handleWebRTCSignal(req: Request): Promise<Response> {
  const headers = {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  try {
    if (req.method === "POST") {
      let message: SignalingMessage;
      try {
        message = await req.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
      }

      const { type, roomId, peerId, peerName, role, data } = message;

      // Handle ping
      if (type === "ping") {
        return Response.json({ pong: true }, { headers });
      }

      if (!roomId || !peerId) {
        return Response.json(
          { error: "Missing roomId or peerId", received: { roomId, peerId, type, role } },
          { status: 400, headers }
        );
      }

      // Get or create room
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          scouts: new Map(),
          messages: [],
          createdAt: Date.now(),
        };
        rooms.set(roomId, room);
      }

      const now = Date.now();

      switch (type) {
        case "join":
          if (role === "lead") {
            room.lead = { id: peerId, name: peerName || "Lead", lastSeen: now };
          } else if (role === "scout") {
            room.scouts.set(peerId, { id: peerId, name: peerName || "Scout", lastSeen: now });
          }
          room.messages.push({ ...message, data, deliveredTo: new Set() });
          break;

        case "leave":
          if (role === "lead") {
            room.lead = undefined;
          } else {
            room.scouts.delete(peerId);
          }
          break;

        case "offer":
        case "answer":
        case "ice-candidate":
          room.messages.push({ ...message, data, deliveredTo: new Set() });
          break;
      }

      return Response.json(
        {
          success: true,
          room: {
            id: room.id,
            leadConnected: !!room.lead,
            scoutCount: room.scouts.size,
          },
        },
        { headers }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const roomId = url.searchParams.get("roomId");
      const peerId = url.searchParams.get("peerId");

      if (!roomId || !peerId) {
        return Response.json({ error: "Missing roomId or peerId" }, { status: 400, headers });
      }

      const room = rooms.get(roomId);
      if (!room) {
        return Response.json(
          {
            messages: [],
            room: { id: roomId, leadConnected: false, scoutCount: 0, scouts: [] },
          },
          { headers }
        );
      }

      // Get messages for this peer (from others, not already delivered)
      const messages = room.messages.filter((msg) => {
        const isOwnMessage = msg.peerId === peerId;
        const alreadyDelivered = msg.deliveredTo?.has(peerId);
        const isTargetedToSomeoneElse = msg.targetPeerId && msg.targetPeerId !== peerId;
        return !isOwnMessage && !alreadyDelivered && !isTargetedToSomeoneElse;
      });

      // Mark messages as delivered to this peer
      messages.forEach((msg) => {
        if (!msg.deliveredTo) msg.deliveredTo = new Set();
        msg.deliveredTo.add(peerId);
      });

      // Clean up fully delivered messages
      room.messages = room.messages.filter((msg) => {
        if (!msg.deliveredTo) return true;

        if (msg.type === "join" && msg.role === "scout") {
          return !room.lead || !msg.deliveredTo.has(room.lead.id);
        }
        if (msg.type === "join" && msg.role === "lead") {
          return Array.from(room.scouts.keys()).some(
            (scoutId) => !msg.deliveredTo?.has(scoutId)
          );
        }
        return msg.deliveredTo.size <= 1;
      });

      return Response.json(
        {
          messages,
          room: {
            id: room.id,
            leadConnected: !!room.lead,
            scoutCount: room.scouts.size,
            scouts: Array.from(room.scouts.values()).map((s) => ({
              id: s.id,
              name: s.name,
            })),
          },
        },
        { headers }
      );
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  } catch (error) {
    console.error("Signaling error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

// ── Static file serving + SPA fallback ─────────────────────────────────────────

function serveStatic(pathname: string): Response | null {
  // Decode percent-encoded characters (e.g. %20 → space) so file lookups work
  const decoded = decodeURIComponent(pathname);
  const filePath = join(DIST_DIR, decoded);

  // Prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) return null;

  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;

  try {
    const file = Bun.file(filePath);
    const ext = extname(pathname);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        // Cache hashed assets aggressively, others briefly
        "Cache-Control": pathname.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=60",
      },
    });
  } catch {
    return null;
  }
}

// ── Main server ────────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // API routes (same paths as Netlify Functions for frontend compatibility)
    if (pathname === "/.netlify/functions/api-proxy") {
      return handleApiProxy(req);
    }

    if (pathname === "/.netlify/functions/webrtc-signal") {
      return handleWebRTCSignal(req);
    }

    // Static files
    const staticResponse = serveStatic(pathname);
    if (staticResponse) return staticResponse;

    // SPA fallback — serve index.html for all unmatched routes
    const indexPath = join(DIST_DIR, "index.html");
    if (existsSync(indexPath)) {
      return new Response(Bun.file(indexPath), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Maneuver 2026 server running on http://localhost:${server.port}`);
