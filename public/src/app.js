import {
  PARTITION_MODES,
  createParticles,
  randomizeVelocities,
  stepParticles,
  collectStatistics,
} from "./simulation.js";

const $ = (id) => document.getElementById(id);
const canvas = $("simulation");
const ctx = canvas.getContext("2d");
const temperatureCanvas = $("temperature-chart");
const pressureCanvas = $("pressure-chart");
const temperatureCtx = temperatureCanvas.getContext("2d");
const pressureCtx = pressureCanvas.getContext("2d");

const settings = {
  mode: $("mode").value,
  count: Number($("count").value),
  speedScale: Number($("speed").value),
  threshold: Number($("threshold").value),
  distribution: $("distribution").value,
};
const WORLD = { width: 2, height: 1 };
const HISTORY_LIMIT = 180;
let particles = [];
let paused = false;
let elapsed = 0;
let totalCrossings = 0;
let lastFrame = 0;
let lastSample = 0;
let history = [];

const format = (value, digits = 2) => value == null || !Number.isFinite(value)
  ? "—"
  : value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function resizeCanvas(target, context) {
  const rect = target.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  target.width = Math.max(1, Math.round(rect.width * dpr));
  target.height = Math.max(1, Math.round(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function worldMetrics() {
  const rect = canvas.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    scaleX: rect.width / WORLD.width,
    scaleY: rect.height / WORLD.height,
  };
}

function createExperiment() {
  particles = createParticles(settings.count, {
    speedScale: settings.speedScale,
    distribution: settings.distribution,
    width: WORLD.width,
    height: WORLD.height,
  });
  elapsed = 0;
  totalCrossings = 0;
  lastSample = 0;
  history = [];
  sampleHistory();
  updateStats();
  draw();
  drawCharts();
}

function resetVelocities() {
  randomizeVelocities(particles, settings.speedScale, settings.distribution);
  updateStats();
}

function sampleHistory() {
  const stats = collectStatistics(particles, WORLD.width);
  history.push({
    time: elapsed,
    leftTemperature: stats.left.temperature,
    rightTemperature: stats.right.temperature,
    pressureDifference: stats.right.pressure - stats.left.pressure,
  });
  if (history.length > HISTORY_LIMIT) history.shift();
}

function updateStats() {
  const stats = collectStatistics(particles, WORLD.width);
  const left = stats.left;
  const right = stats.right;
  $("left-count").textContent = left.count;
  $("right-count").textContent = right.count;
  $("left-share").textContent = `${format(100 * left.count / Math.max(1, stats.total), 0)}% системы`;
  $("right-share").textContent = `${format(100 * right.count / Math.max(1, stats.total), 0)}% системы`;
  $("left-temp").textContent = format(left.temperature);
  $("right-temp").textContent = format(right.temperature);
  $("left-pressure").textContent = format(left.pressure);
  $("right-pressure").textContent = format(right.pressure);
  const difference = right.pressure - left.pressure;
  $("pressure-difference").textContent = `${difference > 0 ? "+" : ""}${format(difference)}`;
  $("crossings").textContent = `Пересечений перегородки: ${totalCrossings}`;
  $("elapsed").textContent = `${format(elapsed, 1)} с`;
  $("simulation-state").textContent = paused ? "На паузе" : "Эксперимент запущен";
  $("pause").textContent = paused ? "Продолжить" : "Пауза";
}

function draw() {
  const { width, height, scaleX, scaleY } = worldMetrics();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c141d";
  ctx.fillRect(0, 0, width, height);

  const dividerX = width / 2;
  ctx.fillStyle = "#111f2b";
  ctx.fillRect(1, 1, dividerX - 1, height - 2);
  ctx.fillStyle = "#13212d";
  ctx.fillRect(dividerX, 1, width - dividerX - 1, height - 2);

  ctx.strokeStyle = "#42576a";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.strokeStyle = settings.mode === PARTITION_MODES.CLOSED ? "#8193a3" : "#39556a";
  ctx.lineWidth = settings.mode === PARTITION_MODES.CLOSED ? 4 : 2;
  ctx.setLineDash(settings.mode === PARTITION_MODES.CLOSED ? [] : [5, 5]);
  ctx.beginPath();
  ctx.moveTo(dividerX, 0);
  ctx.lineTo(dividerX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  if (settings.mode !== PARTITION_MODES.CLOSED) {
    ctx.fillStyle = settings.mode === PARTITION_MODES.DEMON ? "#ffad72" : "#5ed5e8";
    ctx.fillRect(dividerX - 3, height * 0.44, 6, height * 0.12);
    ctx.fillStyle = "#0c141d";
    ctx.fillRect(dividerX - 1, height * 0.46, 2, height * 0.08);
  }
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#9baebe";
  ctx.fillText("ЛЕВАЯ КАМЕРА", 12, 20);
  ctx.fillText("ПРАВАЯ КАМЕРА", dividerX + 12, 20);

  for (const p of particles) {
    ctx.beginPath();
    ctx.fillStyle = Math.hypot(p.vx, p.vy) >= settings.threshold ? "#ffad72" : "#5ed5e8";
    ctx.arc(p.x * scaleX, p.y * scaleY, Math.max(1.6, Math.min(scaleX, scaleY) * 0.006), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChart(target, context, series) {
  const rect = target.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  context.clearRect(0, 0, width, height);
  const pad = { left: 35, right: 8, top: 10, bottom: 24 };
  const chartW = Math.max(1, width - pad.left - pad.right);
  const chartH = Math.max(1, height - pad.top - pad.bottom);
  context.font = "10px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  const values = series.flatMap((s) => s.values.filter(Number.isFinite));
  if (!values.length) return;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (series.some((s) => s.zeroLine)) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (Math.abs(max - min) < 1e-8) { max += 0.5; min -= 0.5; }
  const padding = (max - min) * 0.12;
  min -= padding;
  max += padding;

  context.strokeStyle = "#2b3b4c";
  context.fillStyle = "#8295a5";
  context.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const value = max - (max - min) * i / 4;
    const y = pad.top + chartH * i / 4;
    context.beginPath();
    context.moveTo(pad.left, y);
    context.lineTo(width - pad.right, y);
    context.stroke();
    context.fillText(format(value, 1), pad.left - 6, y);
  }

  for (const s of series) {
    const points = s.values.filter(Number.isFinite);
    if (points.length < 1) continue;
    context.strokeStyle = s.color;
    context.lineWidth = 2;
    context.beginPath();
    points.forEach((value, index) => {
      const x = pad.left + (points.length === 1 ? 0 : index / (points.length - 1)) * chartW;
      const y = pad.top + (max - value) / (max - min) * chartH;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
  }
}

function drawCharts() {
  drawChart(temperatureCanvas, temperatureCtx, [
    { color: "#5ed5e8", values: history.map((point) => point.leftTemperature) },
    { color: "#ffad72", values: history.map((point) => point.rightTemperature) },
  ]);
  drawChart(pressureCanvas, pressureCtx, [
    { color: "#9ed6b4", values: history.map((point) => point.pressureDifference), zeroLine: true },
  ]);
}

function animate(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  if (!paused) {
    elapsed += dt;
    totalCrossings += stepParticles(particles, dt, {
      mode: settings.mode,
      threshold: settings.threshold,
      width: WORLD.width,
      height: WORLD.height,
      speedScale: settings.speedScale,
    });
    if (elapsed - lastSample >= 0.2) {
      lastSample = elapsed;
      sampleHistory();
      updateStats();
      drawCharts();
    }
    draw();
  }
  requestAnimationFrame(animate);
}

$("mode").addEventListener("change", (event) => {
  settings.mode = event.target.value;
  draw();
});
$("count").addEventListener("input", (event) => {
  settings.count = Number(event.target.value);
  $("count-value").textContent = settings.count;
});
$("count").addEventListener("change", createExperiment);
$("speed").addEventListener("input", (event) => {
  settings.speedScale = Number(event.target.value);
  $("speed-value").textContent = `${format(settings.speedScale, 1)}×`;
});
$("speed").addEventListener("change", () => {
  randomizeVelocities(particles, settings.speedScale, settings.distribution);
  updateStats();
});
$("threshold").addEventListener("input", (event) => {
  settings.threshold = Number(event.target.value);
  $("threshold-value").textContent = format(settings.threshold, 1);
  draw();
});
$("distribution").addEventListener("change", (event) => {
  settings.distribution = event.target.value;
  createExperiment();
});
$("pause").addEventListener("click", () => {
  paused = !paused;
  updateStats();
});
$("reset").addEventListener("click", () => {
  paused = false;
  createExperiment();
});
$("shuffle").addEventListener("click", resetVelocities);
$("clear-history").addEventListener("click", () => {
  history = [];
  sampleHistory();
  drawCharts();
});
window.addEventListener("resize", () => {
  resizeCanvas(canvas, ctx);
  resizeCanvas(temperatureCanvas, temperatureCtx);
  resizeCanvas(pressureCanvas, pressureCtx);
  draw();
  drawCharts();
});

resizeCanvas(canvas, ctx);
resizeCanvas(temperatureCanvas, temperatureCtx);
resizeCanvas(pressureCanvas, pressureCtx);
createExperiment();
requestAnimationFrame(animate);