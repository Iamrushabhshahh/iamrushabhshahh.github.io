/* Diagrams for the DNS storm postmortem.
   Same pipeline as diagrams.mjs: one scene definition renders both the SVG the
   post uses and the .excalidraw file you can open and edit by hand.

     npm i roughjs svgo
     node dns-storm.mjs
     npx svgo -f svg -o svg --multipass --precision=1
     cp svg/dns-storm-*.svg ../assets/blog/                                  */
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
const rule = (x, y, len) =>
  ({ type: 'line', x, y, width: 0, height: 0, points: [[0, 0], [len, 0]], strokeColor: '#d0d7de', strokeWidth: 1, strokeStyle: 'dashed', endArrowhead: null });

const MARK = 'DNS storm postmortem';
const out = (name, els, w, h, title) => {
  fs.writeFileSync(`svg/${name}.svg`, renderScene(els, { width: w, height: h, title, mark: MARK }));
  writeScene(name, els);
};
fs.mkdirSync('svg', { recursive: true });

/* ── 1. Where a lookup actually goes, and where the ceiling sits ───── */
out('dns-storm-resolution-path', [
  txt(450, 32, 'Where a DNS lookup on an EC2 box actually goes', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(450, 58, 'and which part of it has a hard limit', { fontSize: 16 }),

  box(40, 96, 170, 44, 'service A', { fill: '#ffffff', stroke: INK, fontSize: 15.5 }),
  box(40, 146, 170, 44, 'service B', { fill: '#ffffff', stroke: INK, fontSize: 15.5 }),
  box(40, 196, 170, 44, 'service C', { fill: '#ffffff', stroke: INK, fontSize: 15.5 }),
  txt(125, 264, '+ 21 more processes', { fontSize: 14.5 }),
  txt(125, 284, 'on the same host', { fontSize: 14.5 }),

  arrow(212, 118, [[54, 57]], { stroke: MUTED }),
  arrow(212, 168, [[54, 7]], { stroke: MUTED }),
  arrow(212, 218, [[54, -43]], { stroke: MUTED }),

  box(268, 130, 186, 90, 'glibc getaddrinfo\n/etc/resolv.conf', { fill: GREYBG, stroke: GREY, fontSize: 15.5 }),
  arrow(456, 175, [[58, 0]], { stroke: INK }),
  box(518, 130, 176, 90, 'one ENI\nudp/53 outbound', { fill: AMBERBG, stroke: AMBER, fontSize: 15.5 }),
  arrow(696, 175, [[50, 0]], { stroke: INK }),
  box(748, 130, 126, 90, 'VPC\nresolver', { fill: BLUEBG, stroke: BLUE, fontSize: 15.5 }),

  arrow(606, 222, [[0, 44]], { stroke: RED }),
  box(300, 268, 440, 86, '1,024 packets per second, per ENI\nover that they are dropped in silence:\nno error, no log line, no CloudWatch metric', { fill: REDBG, stroke: RED, fontSize: 15.5 }),

  box(40, 384, 834, 76, 'Every process on the host spends from that one budget.\nDNS is the only dependency none of them declare.', { fill: '#f6f8fa', stroke: MUTED, fontSize: 16 }),
], 900, 500, 'The DNS resolution path on an EC2 instance and its per-ENI packet limit');

/* ── 2. Search-domain amplification ────────────────────────────────── */
out('dns-storm-search-domain', [
  txt(430, 32, 'Why one lookup leaves the box twice', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(430, 58, 'glibc tries the search-suffixed form first', { fontSize: 16 }),

  box(30, 120, 176, 84, 'one app-level\nlookup', { fill: GREYBG, stroke: GREY, fontSize: 15.5 }),
  arrow(208, 150, [[62, -30]], { stroke: RED }),
  arrow(208, 174, [[62, 32]], { stroke: RED }),

  box(276, 88, 330, 60, 'logs.example.internal.\nap-south-2.compute.internal', { fill: REDBG, stroke: RED, fontSize: 13, mono: true }),
  txt(618, 104, 'NXDOMAIN', { fontSize: 15.5, color: RED, anchor: 'start', weight: 700 }),
  txt(618, 126, 'the suffix does not exist', { fontSize: 14, anchor: 'start' }),

  box(276, 176, 330, 60, 'logs.example.internal', { fill: REDBG, stroke: RED, fontSize: 14, mono: true }),
  txt(618, 192, 'NODATA', { fontSize: 15.5, color: RED, anchor: 'start', weight: 700 }),
  txt(618, 214, 'the name has no A record', { fontSize: 14, anchor: 'start' }),

  rule(60, 262, 740),

  box(140, 286, 580, 62, '', { fill: '#f6f8fa', stroke: MUTED }),
  txt(164, 305, '476  A? logs.example.internal.ap-south-2.compute.internal.', { fontSize: 13, mono: true, anchor: 'start', color: INK }),
  txt(164, 328, '476  A? logs.example.internal.', { fontSize: 13, mono: true, anchor: 'start', color: INK }),
  txt(430, 368, 'The counts pair up exactly. That is the search domain, not the app.', { fontSize: 15.5, color: INK }),

  box(255, 392, 350, 54, 'options ndots:1', { fill: GREENBG, stroke: GREEN, fontSize: 16, mono: true, weight: 600 }),
], 860, 476, 'How a search domain doubles every DNS query');

/* ── 3. Blast radius ───────────────────────────────────────────────── */
out('dns-storm-blast-radius', [
  txt(430, 32, 'What a dead hostname does to services that never used it', { fontSize: 21, color: INK, weight: 600 }),

  box(36, 66, 250, 336, '', { fill: '#fff5f5', stroke: REDBG }),
  txt(161, 96, '24 services', { fontSize: 18.5, color: RED, weight: 700 }),
  txt(161, 120, 'retrying a name that', { fontSize: 15 }),
  txt(161, 140, 'has never existed', { fontSize: 15 }),
  box(66, 164, 190, 54, '46 lookups/sec', { fill: REDBG, stroke: RED, fontSize: 16.5, weight: 600 }),
  txt(161, 240, '282 packets/sec', { fontSize: 16.5, color: INK, weight: 600 }),
  txt(161, 262, 'sustained, for weeks', { fontSize: 15 }),
  box(66, 288, 190, 60, 'ENOTFOUND', { fill: '#ffffff', stroke: RED, fontSize: 14.5, mono: true }),
  txt(161, 368, 'an honest error,', { fontSize: 14.5 }),
  txt(161, 386, 'logged and swallowed', { fontSize: 14.5 }),

  arrow(290, 234, [[32, 0]], { stroke: RED }),

  txt(430, 96, 'shared resolver budget', { fontSize: 16.5, color: INK, weight: 600 }),
  box(330, 118, 200, 40, '', { fill: GREYBG, stroke: GREY }),
  box(334, 122, 52, 32, '', { fill: REDBG, stroke: RED }),
  txt(430, 178, '28% burnt on nothing', { fontSize: 15.5, color: RED, weight: 600 }),
  txt(430, 200, 'with no headroom left', { fontSize: 15 }),
  txt(430, 222, 'for a burst', { fontSize: 15 }),
  arrow(430, 244, [[0, 44]], { stroke: RED }),
  box(320, 296, 220, 66, 'past 1,024 pps\nthe rest is dropped', { fill: REDBG, stroke: RED, fontSize: 15.5 }),

  arrow(538, 234, [[32, 0]], { stroke: RED }),

  box(574, 66, 250, 336, '', { fill: '#fff5f5', stroke: REDBG }),
  txt(699, 96, 'two other services', { fontSize: 18.5, color: RED, weight: 700 }),
  txt(699, 120, 'that do not use', { fontSize: 15 }),
  txt(699, 140, 'Elasticsearch at all', { fontSize: 15 }),
  box(604, 164, 190, 50, 'lose Redis', { fill: '#ffffff', stroke: INK, fontSize: 15.5 }),
  box(604, 222, 190, 50, 'lose Postgres', { fill: '#ffffff', stroke: INK, fontSize: 15.5 }),
  box(604, 288, 190, 60, 'EAI_AGAIN', { fill: AMBERBG, stroke: AMBER, fontSize: 14.5, mono: true }),
  txt(699, 368, 'nothing answered', { fontSize: 14.5 }),
  txt(699, 386, 'in time', { fontSize: 14.5 }),

  box(36, 422, 788, 62, 'about 45,000 failed lookups in a single three-hour window', { fill: AMBERBG, stroke: AMBER, fontSize: 17, weight: 600 }),
], 860, 522, 'How a dead hostname starves DNS for unrelated services');

/* ── 4. Reading the error code ─────────────────────────────────────── */
out('dns-storm-error-codes', [
  txt(430, 32, 'Three failures that look identical in a log', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(430, 58, 'read the code before you read the hostname', { fontSize: 16 }),

  box(30, 84, 258, 252, '', { fill: '#f6f8fa', stroke: GREYBG }),
  box(52, 104, 214, 48, 'ENOTFOUND', { fill: REDBG, stroke: RED, fontSize: 15.5, mono: true, weight: 600 }),
  txt(159, 180, 'DNS answered,', { fontSize: 15.5, color: INK }),
  txt(159, 200, 'and the answer was no', { fontSize: 15.5, color: INK }),
  txt(159, 244, 'fix the record, or the', { fontSize: 15, color: GREEN }),
  txt(159, 264, 'config that builds', { fontSize: 15, color: GREEN }),
  txt(159, 284, 'the name', { fontSize: 15, color: GREEN }),

  box(301, 84, 258, 252, '', { fill: '#f6f8fa', stroke: GREYBG }),
  box(323, 104, 214, 48, 'EAI_AGAIN', { fill: AMBERBG, stroke: AMBER, fontSize: 15.5, mono: true, weight: 600 }),
  txt(430, 180, 'nothing answered', { fontSize: 15.5, color: INK }),
  txt(430, 200, 'in time', { fontSize: 15.5, color: INK }),
  txt(430, 244, 'look at resolver load,', { fontSize: 15, color: GREEN }),
  txt(430, 264, 'not at the service', { fontSize: 15, color: GREEN }),
  txt(430, 284, 'that reported it', { fontSize: 15, color: GREEN }),

  box(572, 84, 258, 252, '', { fill: '#f6f8fa', stroke: GREYBG }),
  box(594, 104, 214, 48, 'ECONNREFUSED', { fill: BLUEBG, stroke: BLUE, fontSize: 15.5, mono: true, weight: 600 }),
  txt(701, 180, 'the name resolved,', { fontSize: 15.5, color: INK }),
  txt(701, 200, 'nothing is listening', { fontSize: 15.5, color: INK }),
  txt(701, 244, 'DNS is fine.', { fontSize: 15, color: GREEN }),
  txt(701, 264, 'the process is down', { fontSize: 15, color: GREEN }),

  box(30, 356, 800, 58, 'One log file, three different problems, three different owners.', { fill: '#f6f8fa', stroke: MUTED, fontSize: 16 }),
], 860, 444, 'ENOTFOUND versus EAI_AGAIN versus ECONNREFUSED');

/* ── 5. Where it could have been stopped ───────────────────────────── */
const rung = (i, y, accent, accentBg, text) => ([
  box(52, y, 54, 54, String(i), { fill: accentBg, stroke: accent, fontSize: 19, weight: 700 }),
  box(118, y, 690, 54, '', { fill: '#ffffff', stroke: MUTED }),
  txt(142, y + 27, text, { fontSize: 14.5, anchor: 'start', color: INK, weight: 500 }),
]);
out('dns-storm-fix-order', [
  txt(430, 32, 'Five places this could have been stopped', { fontSize: 22.5, color: INK, weight: 600 }),
  txt(430, 58, 'any one of them, on its own, would have been enough', { fontSize: 16 }),

  ...rung(1, 88, GREEN, GREENBG, 'Create the missing record. 99.4% of the traffic disappears.'),
  ...rung(2, 152, RED, REDBG, 'Make the logger fail closed after N failures. The actual defect.'),
  ...rung(3, 216, AMBER, AMBERBG, 'Standardise NODE_ENV. Two spellings made two dead hostnames.'),
  ...rung(4, 280, BLUE, BLUEBG, 'Run a caching resolver on the host. It contains the next mistake.'),
  ...rung(5, 344, GREY, GREYBG, 'Alert on DNS queries per host. Nobody has this on a dashboard.'),

  txt(430, 434, 'Only number 2 is a bug. The other four are the reasons it stayed invisible.', { fontSize: 15.5, color: INK }),
], 860, 470, 'Five independent places the DNS storm could have been prevented');

console.log('done');
