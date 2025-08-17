// FOV Visualizer - core logic and rendering
// Projection model: rectilinear (pinhole). Relations:
//   tan(D/2)^2 = tan(H/2)^2 + tan(V/2)^2  for diagonal of the view rectangle.

const $ = (sel) => document.querySelector(sel);

const el = {
  mode: $('#mode'),
  hFov: $('#hFov'), hFovRange: $('#hFovRange'),
  vFov: $('#vFov'), vFovRange: $('#vFovRange'),
  dFov: $('#dFov'), dFovRange: $('#dFovRange'),
  aspectW: $('#aspectW'), aspectH: $('#aspectH'), aspectPreset: $('#aspectPreset'),
  scale: $('#scale'), scaleHint: $('#scaleHint'),
  showGrid: $('#showGrid'), showRoom: $('#showRoom'), showDiag: $('#showDiag'), dimOutside: $('#dimOutside'),
  canvas: $('#canvas'),
};

const ctx = el.canvas.getContext('2d');

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }

function syncPair(a, b){
  // bidirectional sync number <-> range
  const fn = (src, dst) => () => { dst.value = src.value; onInput(); };
  a.addEventListener('input', fn(a, b));
  b.addEventListener('input', fn(b, a));
}

syncPair(el.hFov, el.hFovRange);
syncPair(el.vFov, el.vFovRange);
syncPair(el.dFov, el.dFovRange);

el.aspectPreset.addEventListener('change', () => {
  const v = el.aspectPreset.value;
  if (v !== 'custom'){
    const [w,h] = v.split(':').map(Number);
    el.aspectW.value = String(w);
    el.aspectH.value = String(h);
  }
  onInput();
});

[el.aspectW, el.aspectH].forEach(inp => inp.addEventListener('input', () => {
  el.aspectPreset.value = 'custom';
  onInput();
}));

el.mode.addEventListener('change', onInput);
el.scale.addEventListener('input', () => {
  el.scaleHint.textContent = `${el.scale.value}° / 100px`;
  onInput();
});
[el.showGrid, el.showRoom, el.showDiag, el.dimOutside].forEach(cb => cb.addEventListener('input', onInput));

// Core FOV math
function diagonalFromHV(h, v){
  const th = Math.tan(deg2rad(h/2));
  const tv = Math.tan(deg2rad(v/2));
  const td = Math.sqrt(th*th + tv*tv);
  return 2 * rad2deg(Math.atan(td));
}

function verticalFromHD(h, d){
  const th = Math.tan(deg2rad(h/2));
  const td = Math.tan(deg2rad(d/2));
  if (td <= th) return 1; // prevent NaN
  const tv = Math.sqrt(Math.max(0, td*td - th*th));
  return 2 * rad2deg(Math.atan(tv));
}

function horizontalFromVD(v, d){
  const tv = Math.tan(deg2rad(v/2));
  const td = Math.tan(deg2rad(d/2));
  if (td <= tv) return 1;
  const th = Math.sqrt(Math.max(0, td*td - tv*tv));
  return 2 * rad2deg(Math.atan(th));
}

// Maintain aspect ratio relationship optionally?
// We let user control any two (per mode) and compute the third.
function updateFovByMode(){
  const mode = el.mode.value; // 'hv' | 'hd' | 'vd'
  let h = parseFloat(el.hFov.value);
  let v = parseFloat(el.vFov.value);
  let d = parseFloat(el.dFov.value);

  // sanity clamp
  h = clamp(h, 1, 200); v = clamp(v, 1, 200); d = clamp(d, 1, 260);

  if (mode === 'hv') {
    d = diagonalFromHV(h, v);
    el.dFov.value = el.dFovRange.value = d.toFixed(1);
  } else if (mode === 'hd') {
    v = verticalFromHD(h, d);
    el.vFov.value = el.vFovRange.value = v.toFixed(1);
  } else if (mode === 'vd') {
    h = horizontalFromVD(v, d);
    el.hFov.value = el.hFovRange.value = h.toFixed(1);
  }

  return { h, v, d };
}

function resizeCanvas(){
  const rect = el.canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.canvas.width = Math.floor(rect.width * dpr);
  el.canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', () => { resizeCanvas(); onInput(); });
resizeCanvas();

function draw(){
  const { h, v, d } = updateFovByMode();
  const scale = parseFloat(el.scale.value); // deg per 100px

  const W = el.canvas.clientWidth;
  const H = el.canvas.clientHeight;

  ctx.clearRect(0,0,el.canvas.width, el.canvas.height);

  // Background decorative grid
  if (el.showGrid.checked){
    drawAngularGrid(W, H, scale);
  }

  // Room perspective backdrop
  if (el.showRoom.checked){
    drawRoom(W, H);
  }

  // Compute view rectangle size in pixels under the scale
  // At center of canvas. Width px per degree: 100px / scale
  const pxPerDeg = 100 / scale;
  const viewW = h * pxPerDeg;
  const viewH = v * pxPerDeg;
  const cx = W/2, cy = H/2;

  // Dim outside FOV
  if (el.dimOutside.checked){
    ctx.save();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--dim');
    ctx.beginPath();
    ctx.rect(0,0,W,H);
    ctx.moveTo(cx - viewW/2, cy - viewH/2);
    ctx.rect(cx - viewW/2, cy - viewH/2, viewW, viewH);
    ctx.fill('evenodd');
    ctx.restore();
  }

  // FOV rectangle
  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--fov');
  ctx.lineWidth = 2;
  roundRect(ctx, cx - viewW/2, cy - viewH/2, viewW, viewH, 6);
  ctx.stroke();

  // Diagonal guides
  if (el.showDiag.checked){
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(cx - viewW/2, cy - viewH/2);
    ctx.lineTo(cx + viewW/2, cy + viewH/2);
    ctx.moveTo(cx - viewW/2, cy + viewH/2);
    ctx.lineTo(cx + viewW/2, cy - viewH/2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Angle labels
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${h.toFixed(1)}° H`, cx, cy - viewH/2 - 10);
  ctx.save();
  ctx.translate(cx - viewW/2 - 10, cy);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(`${v.toFixed(1)}° V`, 0, 0);
  ctx.restore();
  ctx.fillText(`${d.toFixed(1)}° D`, cx, cy + viewH/2 + 18);

  ctx.restore();

  // Aspect overlay box
  drawAspectBox(W, H);
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawAngularGrid(W, H, scale){
  const pxPerDeg = 100 / scale;
  const cx = W/2, cy = H/2;
  const style = getComputedStyle(document.documentElement);
  ctx.save();
  ctx.strokeStyle = style.getPropertyValue('--grid');
  ctx.lineWidth = 1;
  ctx.setLineDash([2,4]);

  // Rings every 10 degrees diag equivalent: use diamonds approximating isodeg lines along rect.
  for (let deg = 10; deg <= 170; deg += 10){
    const rad = deg * pxPerDeg / Math.SQRT2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - rad);
    ctx.lineTo(cx + rad, cy);
    ctx.lineTo(cx, cy + rad);
    ctx.lineTo(cx - rad, cy);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 0.7;
  // Axes
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  ctx.stroke();

  // degree tick labels horizontal
  ctx.fillStyle = '#9aa4b2';
  ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  for (let deg = -160; deg <= 160; deg += 20){
    const x = cx + deg * pxPerDeg / 2; // half-degree spacing for visibility
    if (x < 20 || x > W-20) continue;
    ctx.fillText(`${Math.abs(deg)}°`, x, cy + 12);
  }

  ctx.restore();
}

function drawRoom(W, H){
  const cx = W/2, cy = H/2 + 40;
  const depth = Math.min(W, H) * 0.55;
  const width = Math.min(W, H) * 0.8;
  const half = width/2;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;

  // floor grid perspective lines
  for (let i=0; i<=10; i++){
    const t = i/10;
    const y = cy + t*depth;
    const leftX = cx - half * (1 - t*0.6);
    const rightX = cx + half * (1 - t*0.6);
    ctx.beginPath();
    ctx.moveTo(leftX, y); ctx.lineTo(rightX, y); ctx.stroke();
  }
  for (let i=-5; i<=5; i++){
    const t = i/5;
    const x = cx + t*half;
    ctx.beginPath();
    ctx.moveTo(x, cy); ctx.lineTo(x + t*depth*0.6, cy + depth); ctx.stroke();
  }

  ctx.restore();
}

function drawAspectBox(W, H){
  const w = parseFloat(el.aspectW.value);
  const h = parseFloat(el.aspectH.value);
  if (!(w>0 && h>0)) return;
  const targetAR = w/h;
  const margin = 16;
  let boxW = W - margin*2;
  let boxH = boxW / targetAR;
  if (boxH > H - margin*2){
    boxH = H - margin*2;
    boxW = boxH * targetAR;
  }
  const x = (W - boxW)/2, y = (H - boxH)/2;

  ctx.save();
  ctx.strokeStyle = 'rgba(110,231,255,0.35)';
  ctx.setLineDash([4,6]);
  roundRect(ctx, x, y, boxW, boxH, 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(110,231,255,0.12)';
  ctx.fill();
  ctx.restore();
}

function onInput(){
  draw();
}

// initial render
onInput();
