import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const client = new Client("ws://localhost:2567");
const a = await client.joinOrCreate<any>("arena", {
  name: "Alice",
  avatar: "female",
});
const b = await client.joinOrCreate<any>("arena", { name: "Bob" });
try {
  await sleep(350);
  assert.equal(a.roomId, b.roomId);
  assert.equal(a.state.players.size, 2);
  assert.equal(a.state.players.get(a.sessionId).avatar, "female");
  const start = a.state.players.get(a.sessionId).x;
  a.send("input", { x: 999, z: 0, run: true });
  await sleep(160);
  a.send("input", { x: 0, z: 0 });
  await sleep(150);
  const x = a.state.players.get(a.sessionId).x;
  assert.ok(x > start && x - start < 2.6, "server clamps excessive movement");
  a.send("input", { x: 0, z: 0 });
  a.send("attack");
  await sleep(100);
  assert.equal(a.state.players.get(b.sessionId).health, 75);
  a.send("attack");
  await sleep(100);
  assert.equal(
    a.state.players.get(b.sessionId).health,
    75,
    "cooldown rejects spam",
  );
  for (let i = 0; i < 3; i++) {
    await sleep(660);
    a.send("attack");
  }
  await sleep(150);
  assert.equal(a.state.players.get(b.sessionId).health, 0);
  assert.equal(a.state.players.get(a.sessionId).score, 1);
  await sleep(3100);
  assert.equal(a.state.players.get(b.sessionId).health, 100);
  const voice = new Promise<any>((r) => a.onMessage("voiceToken", r));
  a.send("voiceToken");
  assert.ok((await voice).error, "missing voice config reported");
  await b.leave();
  await sleep(150);
  assert.equal(a.state.players.size, 1);
  console.log(
    "PASS: join, shared state, movement clamp, attack cooldown, knockout, respawn, voice status, leave",
  );
} finally {
  await a.leave();
  if (b.connection.isOpen) await b.leave();
}
