import "dotenv/config";
import { defineServer, defineRoom, Room, Client } from "@colyseus/core";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import { AccessToken } from "livekit-server-sdk";
import { move, SPAWNS } from "../shared/world.ts";
class Player extends Schema {
  name = "";
  avatar = "male";
  x = 0;
  z = 0;
  yaw = 0;
  y = 0;
  emote = "";
  health = 100;
  score = 0;
  attack = 0;
}
defineTypes(Player, {
  name: "string",
  avatar: "string",
  x: "number",
  z: "number",
  yaw: "number",
  y: "number",
  emote: "string",
  health: "number",
  score: "number",
  attack: "number",
});
class State extends Schema {
  players = new MapSchema<Player>();
}
defineTypes(State, { players: { map: Player } });
export class Arena extends Room<{ state: State }> {
  state = new State();
  maxClients = 10;
  patchRate = 50;
  playerInputs = new Map<
    string,
    { x: number; z: number; run: boolean; at: number }
  >();
  cooldown = new Map<string, number>();
  vertical = new Map<string, number>();
  emotes = new Map<string, number>();
  onCreate() {
    this.maxMessagesPerSecond = 80;
    this.onMessage("input", (c, m) => {
      if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.z)) return;
      this.playerInputs.set(c.sessionId, {
        x: Math.max(-1, Math.min(1, m.x)),
        z: Math.max(-1, Math.min(1, m.z)),
        run: m.run === true,
        at: Date.now(),
      });
    });
    this.onMessage("jump", (c) => {
      const p = this.state.players.get(c.sessionId);
      if (!p || p.health <= 0 || p.y > 0 || this.vertical.has(c.sessionId))
        return;
      this.vertical.set(c.sessionId, 7);
      p.emote = "";
    });
    this.onMessage("emote", (c, value) => {
      const p = this.state.players.get(c.sessionId);
      if (!p || p.health <= 0 || !["wave", "dance"].includes(value)) return;
      if (Date.now() - (this.emotes.get(c.sessionId) || 0) < 500) return;
      this.emotes.set(c.sessionId, Date.now());
      p.emote = value;
    });
    this.onMessage("attack", (c) => {
      const p = this.state.players.get(c.sessionId),
        now = Date.now();
      if (
        !p ||
        p.health <= 0 ||
        now - (this.cooldown.get(c.sessionId) || 0) < 650
      )
        return;
      this.cooldown.set(c.sessionId, now);
      p.emote = "";
      p.attack++;
      for (const [id, q] of this.state.players) {
        if (
          id === c.sessionId ||
          q.health <= 0 ||
          Math.hypot(p.x - q.x, p.z - q.z, p.y - q.y) > 2.8
        )
          continue;
        q.health = Math.max(0, q.health - 25);
        if (q.health === 0) {
          p.score++;
          this.clock.setTimeout(() => {
            if (this.state.players.has(id)) {
              const s = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
              q.x = s.x;
              q.z = s.z;
              q.health = 100;
              q.y = 0;
              q.emote = "";
              this.vertical.delete(id);
            }
          }, 3000);
        }
      }
    });
    this.onMessage("voiceToken", async (c) => {
      try {
        const {
          LIVEKIT_URL: url,
          LIVEKIT_API_KEY: key,
          LIVEKIT_API_SECRET: secret,
        } = process.env;
        if (!url || !key || !secret) {
          c.send("voiceToken", {
            error: "Voice needs LiveKit credentials on the server.",
          });
          return;
        }
        const token = new AccessToken(key, secret, {
          identity: c.sessionId,
          name: this.state.players.get(c.sessionId)?.name,
          ttl: "1h",
        });
        token.addGrant({
          roomJoin: true,
          room: `arena-${this.roomId}`,
          canPublish: true,
          canSubscribe: true,
          canPublishData: false,
        });
        c.send("voiceToken", { url, token: await token.toJwt() });
      } catch {
        c.send("voiceToken", {
          error: "Could not start voice. Check server configuration.",
        });
      }
    });
    this.setSimulationInterval((ms) => {
      const now = Date.now();
      for (const [id, p] of this.state.players) {
        const dt = Math.min(ms / 1000, 0.1);
        if (p.health <= 0) {
          p.y = 0;
          p.emote = "";
          this.vertical.delete(id);
        }
        const vy = this.vertical.get(id);
        if (vy !== undefined) {
          p.y = Math.max(0, p.y + vy * dt);
          if (p.y === 0 && vy < 0) this.vertical.delete(id);
          else this.vertical.set(id, vy - 20 * dt);
        }
        if (now - (this.emotes.get(id) || 0) > 4000) p.emote = "";
        const i = this.playerInputs.get(id);
        if (!i || p.health <= 0 || now - i.at > 300) continue;
        move(p, i.x, i.z, Math.min(ms / 1000, 0.1), i.run);
        if (i.x || i.z) {
          p.yaw = Math.atan2(i.x, i.z);
          p.emote = "";
        }
      }
    }, 1000 / 30);
  }
  onJoin(c: Client, options: any) {
    const p = new Player();
    p.name =
      typeof options?.name === "string"
        ? options.name.trim().slice(0, 20)
        : "Explorer";
    if (!p.name) p.name = "Explorer";
    p.avatar = options?.avatar === "female" ? "female" : "male";
    const s = SPAWNS[this.state.players.size % SPAWNS.length];
    p.x = s.x;
    p.z = s.z;
    this.state.players.set(c.sessionId, p);
  }
  onLeave(c: Client) {
    this.state.players.delete(c.sessionId);
    this.playerInputs.delete(c.sessionId);
    this.cooldown.delete(c.sessionId);
    this.vertical.delete(c.sessionId);
    this.emotes.delete(c.sessionId);
  }
}
const server = defineServer({
  rooms: { arena: defineRoom(Arena) },
  express: (app) => {
    app.get("/health", (_req, res) => res.json({ ok: true }));
  },
});
server.listen(Number(process.env.PORT) || 2567);
