import json, math

W, H = 1200, 630
LAT0, LAT1 = 22.960, 23.115
LON0, LON1 = 72.487, 72.700

def merc(lat): return math.log(math.tan(math.pi/4 + math.radians(lat)/2))
MY0, MY1 = merc(LAT0), merc(LAT1)
def px(lon, lat):
    return ((lon-LON0)/(LON1-LON0)*W, H - (merc(lat)-MY0)/(MY1-MY0)*H)

def rdp(pts, eps):
    """Ramer-Douglas-Peucker. At 1200px wide, a deviation under ~0.7px is
    invisible, and OSM ways carry far more points than that needs."""
    if len(pts) < 3: return pts
    x0, y0 = pts[0]; x1, y1 = pts[-1]
    dx, dy = x1-x0, y1-y0
    n = math.hypot(dx, dy)
    idx, far = 0, -1.0
    for i in range(1, len(pts)-1):
        px_, py_ = pts[i]
        d = abs(dy*px_ - dx*py_ + x1*y0 - y1*x0) / n if n else math.hypot(px_-x0, py_-y0)
        if d > far: idx, far = i, d
    if far > eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def path(geom, close=False, prec=0, eps=0.7):
    raw = [px(p['lon'], p['lat']) for p in geom]
    if len(raw) < 2: return None
    if all(x < -40 or x > W+40 or y < -40 or y > H+40 for x, y in raw): return None
    simp = rdp(raw, eps) if len(raw) > 2 else raw
    pts, prev = [], None
    for x, y in simp:
        q = (round(x, prec), round(y, prec))
        if q != prev: pts.append(q); prev = q
    if len(pts) < 2: return None
    f = (lambda v: f'{v:g}')
    return 'M' + ' '.join(f'{f(x)} {f(y)}' for x, y in pts) + (' Z' if close else '')

def area(geom):
    p = [px(q['lon'], q['lat']) for q in geom]
    return abs(sum(p[i][0]*p[i-1][1] - p[i-1][0]*p[i][1] for i in range(len(p)))) / 2

major = json.load(open('roads.json'))['elements']
minor = json.load(open('minor.json'))['elements']
water = json.load(open('water.json'))['elements']

# thinnest and palest first; the mesh is the texture, the majors are the structure
TIER = [
    ('service',       .16, '#2b2b2b', .22),
    ('residential',   .26, '#232323', .48),
    ('living_street', .26, '#232323', .48),
    ('unclassified',  .30, '#232323', .52),
    ('pedestrian',    .22, '#232323', .35),
    ('tertiary',      .42, '#1a1a1a', .62),
    ('secondary',     .72, '#141414', .76),
    ('primary',      1.05, '#0d0d0d', .88),
    ('trunk',        1.45, '#000000', .95),
    ('motorway',     1.75, '#000000', 1.0),
]
by = {k: [] for k, *_ in TIER}
for w in major + minor:
    g = w.get('geometry')
    if not g: continue
    k = w['tags'].get('highway')
    if k in by:
        d = path(g)
        if d: by[k].append(d)

rivers, others, lakes = [], [], []
for w in water:
    g = w.get('geometry')
    if not g: continue
    t = w.get('tags', {})
    if t.get('waterway') == 'river':
        d = path(g, eps=0.25)
        if not d: continue
        (rivers if 'sabarmati' in (t.get('name') or '').lower() else others).append(d)
    elif area(g) > 260:      # drop the specks; keep only real water
        d = path(g, close=True)
        if d: lakes.append(d)

o = []; add = o.append
add(f'<rect width="{W}" height="{H}" fill="#f4f2ee"/>')

add('<g id="roads" fill="none" stroke-linecap="round" stroke-linejoin="round">')
for k, sw, col, op in TIER:
    if not by[k]: continue
    add(f'<g stroke="{col}" stroke-width="{sw}" opacity="{op}">')
    for d in by[k]: add(f'<path d="{d}"/>')
    add('</g>')
add('</g>')

add('<g id="water">')
add('<g fill="none" stroke="#c2410c" stroke-width="1.1" opacity=".45" stroke-linecap="round">')
for d in others: add(f'<path d="{d}"/>')
add('</g>')
add('<g fill="#e8590c" opacity=".92">')
for d in lakes: add(f'<path d="{d}"/>')
add('</g>')
add('<g id="sabarmati" fill="none" stroke="#e8590c" stroke-width="3.2" '
    'stroke-linecap="round" stroke-linejoin="round">')
for d in rivers: add(f'<path d="{d}"/>')
add('</g></g>')

add(f'''<g id="title">
<rect x="52" y="{H-146}" width="352" height="94" fill="#f4f2ee" opacity=".93"/>
<rect x="52" y="{H-146}" width="352" height="94" fill="none" stroke="#111" stroke-width="1.6"/>
<text class="h" x="72" y="{H-96}">AHMEDABAD</text>
<text class="s" x="74" y="{H-72}">I N D I A &#183; 23&#176;01&#8242;N 72&#176;35&#8242;E</text>
</g>''')
add(f'<text class="mark" x="{W-18}" y="{H-30}" text-anchor="end">rushabhshah.dev</text>')
add(f'<text class="attr" x="{W-18}" y="{H-16}" text-anchor="end">map data &#169; OpenStreetMap contributors</text>')

style = """<style>
 .h{font-family:'IBM Plex Sans Condensed','Space Grotesk',system-ui,sans-serif;font-size:38px;font-weight:700;letter-spacing:.04em;fill:#111}
 .s{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.16em;fill:#c2410c}
 .mark{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.05em;fill:#6b6459;opacity:.8}
 .attr{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;fill:#8a8377;opacity:.75}
 #roads,#sabarmati{transition:opacity .5s ease,stroke-width .5s ease}
 #amd-map:hover #roads{opacity:.28}
 #amd-map:hover #sabarmati{stroke-width:4.4}
 @media (prefers-reduced-motion:reduce){#roads,#sabarmati{transition:none}}
</style>"""

svg = (f'<svg id="amd-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" '
       f'height="{H}" role="img" aria-labelledby="m-t m-d">'
       f'<title id="m-t">Street map of Ahmedabad, the Sabarmati in orange</title>'
       f'<desc id="m-d">Every street in central Ahmedabad drawn from OpenStreetMap data, with the '
       f'Sabarmati running north to south through the middle in orange, separating the newer west '
       f'of the city from the old walled city on the east bank.</desc>'
       + style + ''.join(o) + '</svg>')
open('amd-map2.svg','w',encoding='utf-8').write(svg)
print(f'  wrote amd-map2.svg  {len(svg)/1024:.0f} KB')
print(f'  roads {sum(len(v) for v in by.values())}   sabarmati {len(rivers)}   other rivers {len(others)}   lakes {len(lakes)}')
