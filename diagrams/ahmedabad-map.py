import json, math, os

# OG=1 renders the social card: major roads only, bigger type. At the size a
# card shows in a feed the residential mesh is unreadable noise that only costs
# bytes, and JPEG hates fine lines.
OG = os.environ.get('OG') == '1'

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
    ('service',       .16, 'r-min', .22),
    ('residential',   .26, 'r-min', .48),
    ('living_street', .26, 'r-min', .48),
    ('unclassified',  .30, 'r-min', .52),
    ('pedestrian',    .22, 'r-min', .35),
    ('tertiary',      .42, 'r-mid', .62),
    ('secondary',     .72, 'r-mid', .76),
    ('primary',      1.05, 'r-maj', .88),
    ('trunk',        1.45, 'r-maj', .95),
    ('motorway',     1.75, 'r-maj', 1.0),
]
by = {k: [] for k, *_ in TIER}
for w in (major if OG else major + minor):
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
add(f'<rect class="paper" width="{W}" height="{H}"/>')

add('<g id="roads" fill="none" stroke-linecap="round" stroke-linejoin="round">')
for k, sw, cls, op in TIER:
    if not by[k]: continue
    add(f'<g class="{cls}" stroke-width="{sw}" opacity="{op}">')
    for d in by[k]: add(f'<path d="{d}"/>')
    add('</g>')
add('</g>')

add('<g id="water">')
add('<g class="w-oth" fill="none" stroke-width="1.1" opacity=".45" stroke-linecap="round">')
for d in others: add(f'<path d="{d}"/>')
add('</g>')
add('<g class="w-lake" opacity=".92">')
for d in lakes: add(f'<path d="{d}"/>')
add('</g>')
add('<g id="sabarmati" class="w-riv" fill="none" stroke-width="3.2" '
    'stroke-linecap="round" stroke-linejoin="round">')
for d in rivers: add(f'<path d="{d}"/>')
add('</g></g>')

add(f'''<g id="title">
<rect class="paper" x="52" y="{H-146}" width="352" height="94" opacity=".93"/>
<rect class="box" x="52" y="{H-146}" width="352" height="94" fill="none" stroke-width="1.6"/>
<text class="h" x="72" y="{H-96}">AHMEDABAD</text>
<text class="s" x="74" y="{H-72}">I N D I A &#183; 23&#176;01&#8242;N 72&#176;35&#8242;E</text>
</g>''')
add(f'<text class="mark" x="{W-18}" y="{H-30}" text-anchor="end">rushabhshah.dev</text>')
add(f'<text class="attr" x="{W-18}" y="{H-16}" text-anchor="end">map data &#169; OpenStreetMap contributors</text>')

style = """<style>
 /* Light is the base palette. Dark is redefined three ways so it holds in all
    three of the site's theme states: OS preference with nothing stamped, and
    either value stamped explicitly by the toggle. Every colour is a token, so
    no rule paints one theme's ink onto the other theme's ground. */
 :root{
   --paper:#f6f8fa; --ink-min:#2f3742; --ink-mid:#1a212b; --ink-maj:#000000;
   --river:#0969da; --lake:#0969da; --oth:#7aa7d8;
   --title:#1f2328; --sub:#0969da; --mark:#6b7280; --box:#1f2328;
 }
 @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
   --paper:#0d1117; --ink-min:#8b949e; --ink-mid:#b6c2ce; --ink-maj:#e6edf3;
   --river:#58a6ff; --lake:#58a6ff; --oth:#3d5a7d;
   --title:#f0f6fc; --sub:#58a6ff; --mark:#8b949e; --box:#e6edf3;
 }}
 :root[data-theme="dark"]{
   --paper:#0d1117; --ink-min:#8b949e; --ink-mid:#b6c2ce; --ink-maj:#e6edf3;
   --river:#58a6ff; --lake:#58a6ff; --oth:#3d5a7d;
   --title:#f0f6fc; --sub:#58a6ff; --mark:#8b949e; --box:#e6edf3;
 }
 .paper{fill:var(--paper)}
 .r-min,.r-mid,.r-maj{fill:none}
 .r-min{stroke:var(--ink-min)} .r-mid{stroke:var(--ink-mid)} .r-maj{stroke:var(--ink-maj)}
 .w-riv{stroke:var(--river)} .w-lake{fill:var(--lake)} .w-oth{stroke:var(--oth)}
 .box{stroke:var(--box)}
 .h{font-family:'IBM Plex Sans Condensed','Space Grotesk',system-ui,sans-serif;font-size:38px;font-weight:700;letter-spacing:.04em;fill:var(--title)}
 .s{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.16em;fill:var(--sub)}
 .mark{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.05em;fill:var(--mark);opacity:.85}
 .attr{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;fill:var(--mark);opacity:.6}
 #roads,#sabarmati{transition:opacity .5s ease,stroke-width .5s ease}
 #amd-map:hover #roads{opacity:.28}
 #amd-map:hover #sabarmati{stroke-width:4.4}
 @media (prefers-reduced-motion:reduce){#roads,#sabarmati{transition:none}}
</style>
<script><![CDATA[
/* The page sets data-theme on <html>, which an <object> document cannot see.
   Same-origin, so mirror it and follow the toggle live. If this is blocked the
   prefers-color-scheme rules above still give the right answer for most people. */
(function(){
  try{
    var host = window.parent && window.parent.document && window.parent.document.documentElement;
    if(!host || host === document.documentElement) return;
    var sync = function(){
      var t = host.getAttribute('data-theme');
      if(t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    };
    sync();
    new MutationObserver(sync).observe(host, {attributes:true, attributeFilter:['data-theme']});
  }catch(e){}
})();
]]></script>"""

svg = (f'<svg id="amd-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" '
       f'height="{H}" role="img" aria-labelledby="m-t m-d">'
       f'<title id="m-t">Street map of Ahmedabad, the Sabarmati in orange</title>'
       f'<desc id="m-d">Every street in central Ahmedabad drawn from OpenStreetMap data, with the '
       f'Sabarmati running north to south through the middle in orange, separating the newer west '
       f'of the city from the old walled city on the east bank.</desc>'
       + style + ''.join(o) + '</svg>')
open('amd-og.svg' if OG else 'amd-map2.svg','w',encoding='utf-8').write(svg)
print(f"  wrote {'amd-og.svg' if OG else 'amd-map2.svg'}  {len(svg)/1024:.0f} KB")
print(f'  roads {sum(len(v) for v in by.values())}   sabarmati {len(rivers)}   other rivers {len(others)}   lakes {len(lakes)}')
