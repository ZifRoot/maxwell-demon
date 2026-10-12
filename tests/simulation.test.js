import test from "node:test";
import assert from "node:assert/strict";
import {
  PARTITION_MODES,
  canCross,
  chamberStatistics,
  collectStatistics,
  createParticles,
  stepParticles,
} from "../src/simulation.js";

test("partition rules distinguish closed, open and one-way passage", () => {
  assert.equal(canCross(PARTITION_MODES.CLOSED, 1, 2), false);
  assert.equal(canCross(PARTITION_MODES.OPEN, -1, 0.1), true);
  assert.equal(canCross(PARTITION_MODES.ONE_WAY, 1, 0.1), true);
  assert.equal(canCross(PARTITION_MODES.ONE_WAY, -1, 2), false);
});

test("demon sends fast particles right and slow particles left", () => {
  assert.equal(canCross(PARTITION_MODES.DEMON, 1, 1.5, 1.2), true);
  assert.equal(canCross(PARTITION_MODES.DEMON, -1, 0.7, 1.2), true);
  assert.equal(canCross(PARTITION_MODES.DEMON, 1, 0.7, 1.2), false);
  assert.equal(canCross(PARTITION_MODES.DEMON, -1, 1.5, 1.2), false);
});

test("temperature subtracts collective velocity and pressure is N times temperature", () => {
  const stats = chamberStatistics([
    { vx: 3, vy: 0 },
    { vx: 5, vy: 0 },
  ]);
  assert.equal(stats.count, 2);
  assert.equal(stats.temperature, 0.5);
  assert.equal(stats.pressure, 1);
});

test("empty chamber has undefined temperature and zero pressure", () => {
  assert.deepEqual(chamberStatistics([]), {
    count: 0, temperature: null, pressure: 0, meanVx: 0, meanVy: 0,
  });
});

test("particles remain in bounds and closed partition prevents crossing", () => {
  const particles = [
    { id: 1, x: 0.98, y: 0.5, vx: 1, vy: 0 },
    { id: 2, x: 1.02, y: 0.5, vx: -1, vy: 0 },
  ];
  for (let i = 0; i < 20; i++) {
    stepParticles(particles, 0.05, {
      mode: PARTITION_MODES.CLOSED, width: 2, height: 1, radius: 0.01,
    });
  }
  assert.ok(particles[0].x < 1);
  assert.ok(particles[1].x > 1);
  assert.ok(particles.every((p) => p.x >= 0 && p.x <= 2 && p.y >= 0 && p.y <= 1));
});

test("open passage counts successful crossings", () => {
  const particles = [{ id: 1, x: 0.98, y: 0.5, vx: 1, vy: 0 }];
  const crossings = stepParticles(particles, 0.05, {
    mode: PARTITION_MODES.OPEN, width: 2, height: 1, radius: 0.005,
  });
  assert.equal(crossings, 1);
  assert.ok(particles[0].x > 1);
});

test("particle factory creates requested number of finite particles", () => {
  const particles = createParticles(25, { width: 2, height: 1 });
  assert.equal(particles.length, 25);
  assert.ok(particles.every((p) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) &&
    Number.isFinite(p.vx) && Number.isFinite(p.vy) &&
    p.x >= 0 && p.x <= 2 && p.y >= 0 && p.y <= 1
  ));
});

test("statistics split particles between chambers", () => {
  const stats = collectStatistics([
    { x: 0.2, y: 0.5, vx: 1, vy: 0 },
    { x: 1.2, y: 0.5, vx: 0, vy: 1 },
    { x: 1.7, y: 0.5, vx: 0, vy: -1 },
  ], 2);
  assert.equal(stats.left.count, 1);
  assert.equal(stats.right.count, 2);
  assert.equal(stats.total, 3);
});