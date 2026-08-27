import { renderScene } from './render.mjs';
import { writeScene } from './to-excalidraw.mjs';
import fs from 'node:fs';

const INK = '#1b1f23', MUTED = '#6b7280';
const BLUE = '#1971c2', BLUEBG = '#a5d8ff';
const RED = '#c92a2a', REDBG = '#ffc9c9';
const GREEN = '#2b8a3e', GREENBG = '#b2f2bb';
const AMBER = '#e67700', AMBERBG = '#ffec99';
const GREY = '#868e96', GREYBG = '#e9ecef';

const R = { type: 3 };
const box = (x, y, w, h, text, { fill, stroke = INK, fontSize = 15, weight = 500, mono = false, color = INK } = {}) =>
  ({ type: 'rectangle', x, y, w, h, width: w, height: h, roundness: R, backgroundColor: fill, fillStyle: 'solid', strokeColor: stroke, label: { text, fontSize, weight, mono, color } });
const txt = (x, y, text, { fontSize = 15, color = MUTED, anchor = 'middle', weight = 400, mono = false } = {}) =>
  ({ type: 'text', x, y, text, fontSize, strokeColor: color, anchor, weight, mono });
const arrow = (x, y, pts, { stroke = INK, dashed = false, sw = 2, head = 'arrow' } = {}) =>
  ({ type: 'arrow', x, y, width: 0, height: 0, points: [[0, 0], ...pts], strokeColor: stroke, strokeWidth: sw, strokeStyle: dashed ? 'dashed' : undefined, endArrowhead: head });

const out = (name, els, w, h, title) => {
  fs.writeFileSync(`svg/${name}.svg`, renderScene(els, { width: w, height: h, title }));
  writeScene(name, els);
};
fs.mkdirSync('svg', { recursive: true });

/* ── 1. Alpha / Beta / Stable ladder ───────────────────────────────── */
out('k8s-137-alpha-beta-stable', [
  txt(430, 34, 'How a Kubernetes feature grows up', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(430, 60, 'and what the v1.37 numbers mean', { fontSize: 16 }),

  box(40, 250, 220, 96, 'ALPHA', { fill: GREYBG, stroke: GREY, fontSize: 18.5, weight: 700 }),
  txt(150, 366, 'Off by default.', { fontSize: 16, color: INK }),
  txt(150, 386, 'Can change or vanish', { fontSize: 16 }),
  txt(150, 404, 'in the next release.', { fontSize: 16 }),
  txt(150, 434, '27 in v1.37', { fontSize: 16.5, color: GREY, weight: 700 }),

  arrow(268, 250, [[46, -48]], { stroke: MUTED }),

  box(320, 180, 220, 96, 'BETA', { fill: AMBERBG, stroke: AMBER, fontSize: 18.5, weight: 700 }),
  txt(430, 296, 'Mostly works, API settling.', { fontSize: 16, color: INK }),
  txt(430, 316, 'Some are now ON by default,', { fontSize: 16 }),
  txt(430, 334, 'which is why upgrades bite.', { fontSize: 16 }),
  txt(430, 364, '23 in v1.37', { fontSize: 16.5, color: AMBER, weight: 700 }),

  arrow(548, 180, [[46, -48]], { stroke: MUTED }),

  box(600, 110, 220, 96, 'STABLE', { fill: GREENBG, stroke: GREEN, fontSize: 18.5, weight: 700 }),
  txt(710, 226, 'Finished and supported.', { fontSize: 16, color: INK }),
  txt(710, 246, 'Safe to build on.', { fontSize: 16 }),
  txt(710, 276, '16 in v1.37', { fontSize: 16.5, color: GREEN, weight: 700 }),

  txt(430, 480, 'A "feature gate" is just the on/off switch you flip to try one early.', { fontSize: 16, color: INK }),
], 860, 528, 'Alpha, Beta and Stable explained');

/* ── 2. Scale to zero ──────────────────────────────────────────────── */
out('k8s-137-scale-to-zero', [
  txt(430, 32, 'Why scale-to-zero needs an outside metric', { fontSize: 22.5, color: INK, weight: 600 }),

  txt(60, 78, 'Scaling on CPU', { fontSize: 17.5, color: RED, anchor: 'start', weight: 700 }),
  box(60, 100, 170, 76, '0 pods\nrunning', { fill: GREYBG, stroke: GREY, fontSize: 16.5 }),
  arrow(238, 138, [[64, 0]], { stroke: RED }),
  box(312, 100, 200, 76, 'no pods means\nno CPU reading', { fill: REDBG, stroke: RED, fontSize: 16 }),
  arrow(520, 138, [[64, 0]], { stroke: RED }),
  box(594, 100, 200, 76, 'nothing to scale\nup from', { fill: REDBG, stroke: RED, fontSize: 16 }),
  txt(694, 196, 'stuck at zero forever', { fontSize: 16, color: RED, weight: 600 }),

  { type: 'line', x: 60, y: 228, width: 0, height: 0, points: [[0, 0], [734, 0]], strokeColor: '#d0d7de', strokeWidth: 1, strokeStyle: 'dashed', endArrowhead: null },

  txt(60, 268, 'Scaling on queue depth', { fontSize: 17.5, color: GREEN, anchor: 'start', weight: 700 }),
  box(60, 290, 170, 76, '0 pods\nrunning', { fill: GREYBG, stroke: GREY, fontSize: 16.5 }),
  arrow(238, 328, [[64, 0]], { stroke: BLUE }),
  box(312, 290, 200, 76, 'queue still reports\n12 jobs waiting', { fill: BLUEBG, stroke: BLUE, fontSize: 16 }),
  txt(412, 386, 'lives outside the cluster, so it\nkeeps reporting at zero pods', { fontSize: 15 }),
  arrow(520, 328, [[64, 0]], { stroke: GREEN }),
  box(594, 290, 200, 76, 'HPA wakes it up\n3 pods', { fill: GREENBG, stroke: GREEN, fontSize: 16 }),

  box(60, 418, 734, 74, 'spec.minReplicas: 0\nobject and external metrics only, never CPU or memory', { fill: '#f6f8fa', stroke: MUTED, fontSize: 15, mono: true, weight: 500 }),
], 860, 530, 'Why scale to zero needs an external metric');

/* ── 3. Gang scheduling ────────────────────────────────────────────── */
const grid = (ox, oy, n, running, fillOn, strokeOn) => {
  const cells = [];
  const cols = 8, s = 18, gap = 4;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const on = i < running;
    cells.push({
      type: 'rectangle', x: ox + c * (s + gap), y: oy + r * (s + gap), width: s, height: s,
      roundness: { type: 3 }, backgroundColor: on ? fillOn : GREYBG, fillStyle: 'solid',
      strokeColor: on ? strokeOn : GREY, strokeWidth: 1.3, roughness: 0.9,
    });
  }
  return cells;
};
out('k8s-137-gang-scheduling', [
  txt(430, 32, 'One training job, 64 pods', { fontSize: 22.5, color: INK, weight: 600 }),

  box(40, 62, 370, 316, '', { fill: '#fff5f5', stroke: REDBG }),
  txt(225, 92, 'Default scheduler', { fontSize: 18.5, color: RED, weight: 700 }),
  txt(225, 114, 'places pods one at a time', { fontSize: 16 }),
  ...grid(139, 138, 64, 40, GREENBG, GREEN),
  txt(225, 336, '40 running, 24 pending', { fontSize: 16.5, color: INK, weight: 600 }),
  txt(225, 358, 'GPUs held. Zero useful work.', { fontSize: 16, color: RED }),

  box(450, 62, 370, 316, '', { fill: '#f4fce3', stroke: GREENBG }),
  txt(635, 92, 'Gang scheduling', { fontSize: 18.5, color: GREEN, weight: 700 }),
  txt(635, 114, 'all of it, or none of it', { fontSize: 16 }),
  ...grid(549, 138, 64, 64, GREENBG, GREEN),
  txt(635, 336, 'all 64 start together', { fontSize: 16.5, color: INK, weight: 600 }),
  txt(635, 358, 'or the whole group waits in queue', { fontSize: 16, color: GREEN }),

  txt(430, 412, 'Beta in v1.37, through the Workload API and PodGroup', { fontSize: 16, color: INK }),
], 860, 460, 'Gang scheduling versus one pod at a time');

/* ── 4. API server startup ─────────────────────────────────────────── */
out('k8s-137-apiserver-startup', [
  txt(430, 32, 'Why the API server now starts faster', { fontSize: 22.5, color: INK, weight: 600 }),

  txt(56, 76, 'Before', { fontSize: 17.5, color: RED, anchor: 'start', weight: 700 }),
  box(56, 98, 150, 74, 'etcd', { fill: BLUEBG, stroke: BLUE, fontSize: 16.5 }),
  arrow(214, 135, [[70, 0]], { stroke: RED }),
  txt(249, 84, 'one giant blob', { fontSize: 14, color: RED }),
  box(292, 98, 190, 74, 'built fully\nin memory first', { fill: REDBG, stroke: RED, fontSize: 16 }),
  arrow(490, 135, [[70, 0]], { stroke: RED }),
  box(568, 98, 236, 74, '1 decoder, one event\nat a time, everything queues', { fill: REDBG, stroke: RED, fontSize: 15 }),

  { type: 'line', x: 56, y: 208, width: 0, height: 0, points: [[0, 0], [748, 0]], strokeColor: '#d0d7de', strokeWidth: 1, strokeStyle: 'dashed', endArrowhead: null },

  txt(56, 244, 'v1.37', { fontSize: 17.5, color: GREEN, anchor: 'start', weight: 700 }),
  box(56, 266, 150, 74, 'etcd 3.7', { fill: BLUEBG, stroke: BLUE, fontSize: 16.5 }),
  arrow(214, 303, [[70, 0]], { stroke: GREEN }),
  txt(249, 252, 'streamed chunks', { fontSize: 14, color: GREEN }),
  box(292, 266, 190, 74, 'decoded as each\nchunk arrives', { fill: GREENBG, stroke: GREEN, fontSize: 16 }),
  arrow(490, 303, [[70, 0]], { stroke: GREEN }),
  box(568, 266, 236, 74, '10 workers in parallel,\nreordered before delivery', { fill: GREENBG, stroke: GREEN, fontSize: 15 }),

  box(230, 380, 400, 62, 'about 55% faster to warm the cache\nbenchmarked over 150,000 pods', { fill: AMBERBG, stroke: AMBER, fontSize: 16.5, weight: 600 }),
], 860, 484, 'API server startup before and after v1.37');

/* ── 5. SELinux upgrade landmine ───────────────────────────────────── */
out('k8s-137-selinux-breakage', [
  txt(430, 32, 'The SELinux change that can break your upgrade', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(430, 58, 'two pods with different SELinux labels, sharing one volume', { fontSize: 16 }),

  box(40, 88, 370, 300, '', { fill: '#f4fce3', stroke: GREENBG }),
  txt(225, 118, 'v1.36 and earlier', { fontSize: 18.5, color: GREEN, weight: 700 }),
  box(70, 142, 140, 62, 'Pod A\nlabel c1', { fill: '#ffffff', stroke: INK, fontSize: 16 }),
  box(240, 142, 140, 62, 'Pod B\nlabel c2', { fill: '#ffffff', stroke: INK, fontSize: 16 }),
  arrow(140, 208, [[42, 52]], { stroke: GREEN }),
  arrow(310, 208, [[-42, 52]], { stroke: GREEN }),
  box(130, 268, 190, 70, 'volume relabelled\nrecursively', { fill: GREENBG, stroke: GREEN, fontSize: 16 }),
  txt(225, 364, 'both pods start', { fontSize: 16.5, color: GREEN, weight: 600 }),

  box(450, 88, 370, 300, '', { fill: '#fff5f5', stroke: REDBG }),
  txt(635, 118, 'v1.37', { fontSize: 18.5, color: RED, weight: 700 }),
  box(480, 142, 140, 62, 'Pod A\nlabel c1', { fill: '#ffffff', stroke: INK, fontSize: 16 }),
  box(650, 142, 140, 62, 'Pod B\nlabel c2', { fill: '#ffffff', stroke: INK, fontSize: 16 }),
  arrow(550, 208, [[42, 52]], { stroke: GREEN }),
  arrow(720, 208, [[-42, 52]], { stroke: RED, dashed: true }),
  txt(752, 240, 'refused', { fontSize: 15, color: RED, weight: 600 }),
  box(540, 268, 190, 70, 'mounted with ONE\nSELinux context', { fill: REDBG, stroke: RED, fontSize: 16 }),
  txt(635, 364, 'Pod B fails to start', { fontSize: 16.5, color: RED, weight: 600 }),

  box(190, 410, 480, 74, 'keep the old behaviour per pod:\n.spec.seLinuxChangePolicy: Recursive', { fill: '#f6f8fa', stroke: MUTED, fontSize: 15, mono: true, weight: 500 }),
], 860, 516, 'SELinux volume labelling change in v1.37');

console.log('done');
