export const SIZE = 110;
export const SPAWNS = [
  { x: 0, z: 0 },
  { x: 3, z: 0 },
  { x: -3, z: 0 },
  { x: 0, z: 3 },
  { x: 0, z: -3 },
  { x: 4, z: 4 },
  { x: -4, z: 4 },
  { x: 4, z: -4 },
  { x: -4, z: -4 },
  { x: 6, z: 0 },
];
export const obstacles = Array.from({ length: 75 }, (_, i) => {
  const a = i * 2.399963;
  const r = 18 + ((i * 17) % 85);
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    r: i % 3 === 0 ? 2.2 : 1.2,
    rock: i % 3 === 0,
  };
});
export function move(
  p: { x: number; z: number },
  dx: number,
  dz: number,
  dt: number,
  run: boolean,
) {
  const len = Math.hypot(dx, dz);
  if (len > 1) {
    dx /= len;
    dz /= len;
  }
  const speed = run ? 10 : 5;
  const valid = (x: number, z: number) =>
    Math.abs(x) < SIZE &&
    Math.abs(z) < SIZE &&
    !obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.55);
  const x = p.x + dx * speed * dt,
    z = p.z + dz * speed * dt;
  if (valid(x, p.z)) p.x = x;
  if (valid(p.x, z)) p.z = z;
}
