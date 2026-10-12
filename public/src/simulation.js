export const PARTITION_MODES = Object.freeze({
  CLOSED: "closed",
  OPEN: "open",
  ONE_WAY: "one-way",
  DEMON: "demon",
});

const EPSILON = 1e-7;

function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function randomSpeed(distribution) {
  if (distribution === "mb") {
    // Rayleigh speed distribution, corresponding to 2D Maxwell–Boltzmann velocities.
    const u = Math.max(Number.EPSILON, 1 - Math.random());
    return Math.sqrt(-2 * Math.log(u)) / 1.8;
  }
  return 0.25 + Math.random() * 1.35;
}

export function createParticles(count, options = {}) {
  const { speedScale = 1, distribution = "uniform", width = 1, height = 1 } = options;
  return Array.from({ length: count }, (_, id) => {
    const direction = randomDirection();
    const speed = randomSpeed(distribution) * speedScale;
    return {
      id,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: direction.x * speed,
      vy: direction.y * speed,
    };
  });
}

export function randomizeVelocities(particles, speedScale = 1, distribution = "uniform") {
  for (const particle of particles) {
    const direction = randomDirection();
    const speed = randomSpeed(distribution) * speedScale;
    particle.vx = direction.x * speed;
    particle.vy = direction.y * speed;
  }
  return particles;
}

export function canCross(mode, direction, speed, threshold = 1.2) {
  if (mode === PARTITION_MODES.CLOSED) return false;
  if (mode === PARTITION_MODES.OPEN) return true;
  if (mode === PARTITION_MODES.ONE_WAY) return direction > 0;
  if (mode === PARTITION_MODES.DEMON) {
    return direction > 0 ? speed >= threshold : speed < threshold;
  }
  return false;
}

export function stepParticles(particles, deltaSeconds, options = {}) {
  const {
    mode = PARTITION_MODES.OPEN,
    threshold = 1.2,
    width = 1,
    height = 1,
    radius = 0.006,
    speedScale = 1,
  } = options;
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
  let crossings = 0;
  const left = radius;
  const right = width - radius;
  const top = radius;
  const bottom = height - radius;
  const divider = width / 2;

  for (const p of particles) {
    const previousX = p.x;
    const nextX = p.x + p.vx * dt;
    p.y += p.vy * dt;

    if (p.y < top) {
      p.y = top + (top - p.y);
      p.vy = Math.abs(p.vy);
    } else if (p.y > bottom) {
      p.y = bottom - (p.y - bottom);
      p.vy = -Math.abs(p.vy);
    }
    p.y = Math.min(bottom, Math.max(top, p.y));

    if (previousX < divider && nextX >= divider) {
      if (canCross(mode, 1, Math.hypot(p.vx, p.vy), threshold)) {
        p.x = nextX;
        crossings++;
      } else {
        p.x = divider - radius - EPSILON;
        p.vx = -Math.abs(p.vx);
      }
    } else if (previousX > divider && nextX <= divider) {
      if (canCross(mode, -1, Math.hypot(p.vx, p.vy), threshold)) {
        p.x = nextX;
        crossings++;
      } else {
        p.x = divider + radius + EPSILON;
        p.vx = Math.abs(p.vx);
      }
    } else {
      p.x = nextX;
    }

    if (p.x < left) {
      p.x = left + (left - p.x);
      p.vx = Math.abs(p.vx);
    } else if (p.x > right) {
      p.x = right - (p.x - right);
      p.vx = -Math.abs(p.vx);
    }
    p.x = Math.min(right, Math.max(left, p.x));
  }
  return crossings;
}

export function chamberStatistics(particles) {
  if (particles.length === 0) {
    return { count: 0, temperature: null, pressure: 0, meanVx: 0, meanVy: 0 };
  }
  let meanVx = 0;
  let meanVy = 0;
  for (const p of particles) {
    meanVx += p.vx;
    meanVy += p.vy;
  }
  meanVx /= particles.length;
  meanVy /= particles.length;

  let peculiarEnergy = 0;
  for (const p of particles) {
    const vx = p.vx - meanVx;
    const vy = p.vy - meanVy;
    peculiarEnergy += vx * vx + vy * vy;
  }
  const temperature = peculiarEnergy / (2 * particles.length);
  return {
    count: particles.length,
    temperature,
    pressure: particles.length * temperature,
    meanVx,
    meanVy,
  };
}

export function collectStatistics(particles, width = 1) {
  const divider = width / 2;
  const left = [];
  const right = [];
  for (const particle of particles) {
    (particle.x < divider ? left : right).push(particle);
  }
  return {
    left: chamberStatistics(left),
    right: chamberStatistics(right),
    total: particles.length,
  };
}