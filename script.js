// Shows: add one entry per gig. Dates are YYYY-MM-DD.
// Past dates move to "Past shows" automatically.
// TODO: these are placeholders; replace with real gigs.
const SHOWS = [
  { date: "2026-12-05", venue: "Venue Name", city: "New Orleans, LA", band: "with Band Name", link: "" },
  { date: "2026-12-19", venue: "Venue Name", city: "New Orleans, LA", band: "with Band Name", link: "" },
  { date: "2026-10-12", venue: "Venue Name", city: "New Orleans, LA", band: "with Band Name", link: "" },
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Shows ---------- */
function renderShow(show) {
  const d = new Date(show.date + "T00:00:00");
  const month = d.toLocaleString("en-US", { month: "short" });
  const el = document.createElement("article");
  el.className = "show";
  el.innerHTML = `
    <div class="show__date"><span class="show__month">${month}</span><span class="show__day">${String(d.getDate()).padStart(2, "0")}</span></div>
    <div>
      <p class="show__venue"></p>
      <p class="show__detail"></p>
    </div>`;
  el.querySelector(".show__venue").textContent = show.venue;
  el.querySelector(".show__detail").textContent = [show.band, show.city].filter(Boolean).join(" · ");
  if (show.link) {
    const a = document.createElement("a");
    a.className = "show__link";
    a.href = show.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Tickets";
    el.appendChild(a);
  }
  return el;
}

function renderShows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = [...SHOWS].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((s) => new Date(s.date + "T00:00:00") >= today);
  const past = sorted.filter((s) => new Date(s.date + "T00:00:00") < today).reverse();

  const upEl = document.getElementById("shows-upcoming");
  if (upcoming.length) {
    upcoming.forEach((s) => upEl.appendChild(renderShow(s)));
  } else {
    upEl.innerHTML = '<p class="shows__empty">No dates posted right now. Get in touch to book.</p>';
  }

  const pastEl = document.getElementById("shows-past");
  if (past.length) {
    past.forEach((s) => pastEl.appendChild(renderShow(s)));
  } else {
    pastEl.closest("details").hidden = true;
  }
}

/* ---------- Oscilloscope + knobs ----------
   Pointer position steers the trace: vertical = pitch (low E up two octaves),
   horizontal = harmonic content. Chaos mode adds noise and cycles colors. */
const scope = {
  canvas: document.getElementById("scope"),
  hzEl: document.getElementById("scope-hz"),
  knobs: document.querySelectorAll("[data-knob]"),
  target: { x: 0.35, y: 0.25 },
  cur: { x: 0.35, y: 0.25 },
  chaos: 0,
  t: 0,
  running: false,
  colors: ["#8eb2cc", "#8a6bb5", "#9cc79a", "#d9bf63"],
};

function sizeScope() {
  const c = scope.canvas;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = c.clientWidth * dpr;
  c.height = c.clientHeight * dpr;
  scope.ctx = c.getContext("2d");
  scope.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawScope() {
  const { ctx, canvas, cur, target } = scope;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  cur.x += (target.x - cur.x) * 0.06;
  cur.y += (target.y - cur.y) * 0.06;

  const octaves = cur.y * 2;
  const cycles = 2.5 * Math.pow(2, octaves);
  const h2 = 0.15 + cur.x * 0.6;
  const h3 = cur.x * cur.x * 0.5;
  const chaos = scope.chaos;

  ctx.clearRect(0, 0, w, h);
  const color = chaos ? scope.colors[Math.floor(scope.t * 4) % scope.colors.length] : scope.colors[0];

  for (const pass of [{ width: 7, alpha: 0.18 }, { width: 2, alpha: 1 }]) {
    ctx.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const p = (px / w) * Math.PI * 2 * cycles - scope.t * 3;
      let v = Math.sin(p) + h2 * Math.sin(2 * p + scope.t) + h3 * Math.sin(3 * p - scope.t * 0.7);
      v /= 1 + h2 + h3;
      if (chaos) v += (Math.random() - 0.5) * 0.35 + 0.3 * Math.sin(p * 7.3 + scope.t * 5);
      const y = h / 2 - v * h * 0.36;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = pass.alpha;
    ctx.lineWidth = pass.width;
    ctx.shadowColor = color;
    ctx.shadowBlur = pass.alpha === 1 ? 8 : 0;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  scope.hzEl.textContent = (41.2 * Math.pow(2, octaves)).toFixed(1);
  const knobVals = [cur.y, cur.x, chaos];
  scope.knobs.forEach((k, i) => k.style.setProperty("--rot", `${-135 + knobVals[i] * 270}deg`));
}

function loop() {
  if (!scope.running) return;
  scope.t += 0.016;
  drawScope();
  requestAnimationFrame(loop);
}

function initScope() {
  sizeScope();
  window.addEventListener("resize", () => { sizeScope(); if (reducedMotion) drawScope(); });
  if (reducedMotion) {
    scope.cur = { ...scope.target };
    drawScope();
    return;
  }
  window.addEventListener("pointermove", (e) => {
    scope.target.x = e.clientX / window.innerWidth;
    scope.target.y = 1 - e.clientY / window.innerHeight;
  });
  // Only animate while the hero is on screen.
  new IntersectionObserver(([entry]) => {
    const wasRunning = scope.running;
    scope.running = entry.isIntersecting;
    if (scope.running && !wasRunning) loop();
  }).observe(scope.canvas);
}

/* ---------- Easter egg: Konami code toggles chaos mode ---------- */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiPos = 0;

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("is-shown");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("is-shown"), 2200);
}

function toggleChaos() {
  const on = document.body.classList.toggle("chaos");
  scope.chaos = on ? 1 : 0;
  document.querySelectorAll(".names li").forEach((li) => {
    li.style.setProperty("--cr", on ? `${(Math.random() * 14 - 7).toFixed(1)}deg` : "0deg");
    li.style.setProperty("--cy", on ? `${(Math.random() * 16 - 8).toFixed(0)}px` : "0px");
  });
  if (reducedMotion) drawScope();
  toast(on ? "✦ Chaos mode: ON" : "Chaos mode: off");
}

document.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : key === KONAMI[0] ? 1 : 0;
  if (konamiPos === KONAMI.length) {
    konamiPos = 0;
    toggleChaos();
  }
});

renderShows();
initScope();
document.getElementById("year").textContent = new Date().getFullYear();
