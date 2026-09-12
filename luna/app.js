import { landmarks } from "./data/landmarks.js";

const viewport = document.querySelector("#viewport");
const moonShell = document.querySelector("#moonShell");
const labels = document.querySelector("#labels");
const devToggle = document.querySelector("#devToggle");
const devPanel = document.querySelector("#devPanel");
const devReadout = document.querySelector("#devReadout");
const probeReadout = document.querySelector("#probeReadout");
const resetView = document.querySelector("#resetView");
const hint = document.querySelector("#hint");

const state = {
  zoom: 1,
  panX: 0,
  panY: 0,
  baseSize: 0,
  devMode: false,
  probe: null,
};

const pointers = new Map();
let gesture = null;
let moved = false;
let hintTimer;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function renderLabels() {
  labels.innerHTML = landmarks.map((landmark) => `
    <div class="landmark" data-id="${landmark.id}" aria-label="${landmark.nameJa}">
      <span>${landmark.nameJa}</span>
      <span class="landmark__roman">${landmark.nameLatin}</span>
    </div>
  `).join("");
}

function getGeometry() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const size = state.baseSize;
  const scaledSize = size * state.zoom;
  return {
    width,
    height,
    size,
    scaledSize,
    left: width / 2 - scaledSize / 2 + state.panX,
    top: height / 2 - scaledSize / 2 + state.panY,
  };
}

function render() {
  const geometry = getGeometry();
  moonShell.style.left = `${geometry.left}px`;
  moonShell.style.top = `${geometry.top}px`;
  moonShell.style.width = `${geometry.scaledSize}px`;
  moonShell.style.height = `${geometry.scaledSize}px`;

  for (const landmark of landmarks) {
    const node = labels.querySelector(`[data-id="${landmark.id}"]`);
    if (!node) continue;
    node.style.left = `${geometry.left + landmark.x * geometry.scaledSize}px`;
    node.style.top = `${geometry.top + landmark.y * geometry.scaledSize}px`;
  }

  if (state.devMode) {
    devReadout.textContent = [
      `viewport: ${Math.round(geometry.width)} × ${Math.round(geometry.height)}`,
      `moon: left ${Math.round(geometry.left)}, top ${Math.round(geometry.top)}`,
      `moon size: ${Math.round(geometry.scaledSize)}px`,
      `zoom: ${state.zoom.toFixed(2)}×`,
      `pan: ${Math.round(state.panX)}, ${Math.round(state.panY)}`,
      state.probe ? `probe x/y: ${state.probe.x.toFixed(4)}, ${state.probe.y.toFixed(4)}` : "probe x/y: —",
    ].join("\n");
  }
}

function resize() {
  state.baseSize = Math.min(viewport.clientWidth, viewport.clientHeight) * 0.78;
  render();
}

function keepMoonNearby() {
  const maxPan = Math.max(0, state.baseSize * state.zoom * 0.68);
  state.panX = clamp(state.panX, -maxPan, maxPan);
  state.panY = clamp(state.panY, -maxPan, maxPan);
}

function setZoom(nextZoom, anchor = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }) {
  const oldZoom = state.zoom;
  const newZoom = clamp(nextZoom, 1, 5);
  if (newZoom === oldZoom) return;

  const cx = viewport.clientWidth / 2;
  const cy = viewport.clientHeight / 2;
  const worldX = (anchor.x - cx - state.panX) / oldZoom;
  const worldY = (anchor.y - cy - state.panY) / oldZoom;
  state.zoom = newZoom;
  state.panX = anchor.x - cx - worldX * newZoom;
  state.panY = anchor.y - cy - worldY * newZoom;
  keepMoonNearby();
  render();
}

function setProbe(clientX, clientY) {
  const geometry = getGeometry();
  const x = (clientX - geometry.left) / geometry.scaledSize;
  const y = (clientY - geometry.top) / geometry.scaledSize;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  state.probe = { x, y };
  probeReadout.textContent = `probe x/y: ${x.toFixed(4)}, ${y.toFixed(4)}  （仮表示座標）`;
  render();
}

function startGesture(event) {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  viewport.setPointerCapture?.(event.pointerId);
  moved = false;
  if (pointers.size === 1) {
    gesture = {
      kind: "pan",
      startX: event.clientX,
      startY: event.clientY,
      startPanX: state.panX,
      startPanY: state.panY,
    };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = {
      kind: "pinch",
      startZoom: state.zoom,
      startPanX: state.panX,
      startPanY: state.panY,
      startDistance: distance(a, b),
      startMidpoint: midpoint(a, b),
    };
  }
  viewport.classList.add("is-dragging");
  hint.classList.add("is-hidden");
  clearTimeout(hintTimer);
}

function moveGesture(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!gesture) return;

  if (gesture.kind === "pan" && pointers.size === 1) {
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) > 4) moved = true;
    state.panX = gesture.startPanX + dx;
    state.panY = gesture.startPanY + dy;
    keepMoonNearby();
    render();
  } else if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const currentDistance = distance(a, b);
    const currentMidpoint = midpoint(a, b);
    const nextZoom = clamp(gesture.startZoom * (currentDistance / gesture.startDistance), 1, 5);
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    const worldX = (gesture.startMidpoint.x - cx - gesture.startPanX) / gesture.startZoom;
    const worldY = (gesture.startMidpoint.y - cy - gesture.startPanY) / gesture.startZoom;
    state.zoom = nextZoom;
    state.panX = currentMidpoint.x - cx - worldX * nextZoom;
    state.panY = currentMidpoint.y - cy - worldY * nextZoom;
    if (Math.abs(nextZoom - gesture.startZoom) > 0.02) moved = true;
    keepMoonNearby();
    render();
  }
}

function endGesture(event) {
  pointers.delete(event.pointerId);
  if (pointers.size === 0) {
    viewport.classList.remove("is-dragging");
    if (!moved && state.devMode) setProbe(event.clientX, event.clientY);
    gesture = null;
    hintTimer = window.setTimeout(() => hint.classList.remove("is-hidden"), 5000);
  } else if (pointers.size === 1) {
    const [remaining] = [...pointers.values()];
    gesture = {
      kind: "pan",
      startX: remaining.x,
      startY: remaining.y,
      startPanX: state.panX,
      startPanY: state.panY,
    };
  }
}

viewport.addEventListener("pointerdown", startGesture, { passive: false });
viewport.addEventListener("pointermove", moveGesture, { passive: false });
viewport.addEventListener("pointerup", endGesture, { passive: false });
viewport.addEventListener("pointercancel", endGesture, { passive: false });
viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  setZoom(state.zoom * Math.exp(-event.deltaY * 0.001), { x: event.clientX, y: event.clientY });
  hint.classList.add("is-hidden");
}, { passive: false });

devToggle.addEventListener("click", () => {
  state.devMode = !state.devMode;
  devToggle.setAttribute("aria-pressed", String(state.devMode));
  devPanel.hidden = !state.devMode;
  if (state.devMode && !state.probe) {
    probeReadout.textContent = "月面をタップすると正規化座標を取得";
  }
  render();
});

resetView.addEventListener("click", (event) => {
  event.stopPropagation();
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  render();
});

window.addEventListener("resize", resize);
renderLabels();
resize();
