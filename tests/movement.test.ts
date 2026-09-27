import { test } from "node:test";
import assert from "node:assert/strict";
import { move, obstacles, SIZE } from "../shared/world.ts";
test("diagonal input cannot exceed running speed", () => {
  const p = { x: 0, z: 0 };
  move(p, 1, 1, 0.1, true);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - 1) < 0.0001);
});
test("map boundary blocks movement", () => {
  const p = { x: SIZE - 0.1, z: 0 };
  move(p, 1, 0, 0.1, true);
  assert.equal(p.x, SIZE - 0.1);
});
test("obstacles block entry", () => {
  const o = obstacles[0],
    p = { x: o.x - o.r - 0.6, z: o.z };
  move(p, 1, 0, 0.1, false);
  assert.equal(p.x, o.x - o.r - 0.6);
});
