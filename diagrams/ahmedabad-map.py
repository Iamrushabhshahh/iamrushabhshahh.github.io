import json, math

W, H, PAD = 1200, 630, 0
# tight crop on the city, wider than tall to suit a hero
LAT0, LAT1 = 22.915, 23.150
LON0, LON1 = 72.440, 72.760

def merc(lat):  # web mercator y
    return math.log(math.tan(math.pi/4 + math.radians(lat)/2))
MY0, MY1 = merc(LAT0), merc(LAT1)

def px(lon, lat):
    x = (lon - LON0) / (LON1 - LON0) * W
    y = H - (merc(lat) - MY0) / (MY1 - MY0) * H
    return x, y

def path(geom, close=False):
    raw = [px(p['lon'], p['lat']) for p in geom]
    if len(raw) < 2: return None
    if all(x < -60 or x > W+60 or y < -60 or y > H+60 for x, y in raw): return None
    pts, prev = [], None
    for x, y in raw:
        q = (round(x), round(y))
        if q != prev: pts.append(q); prev = q
    if len(pts) < 2: return None
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in pts)
    return d + (' Z' if close else '')

roads = json.load(open('roads.json'))['elements']
water = json.load(open('water.json'))['elements']

TIER = {  # class: (stroke width, opacity)
    'motorway': (1.9, .95), 'trunk': (1.6, .90), 'primary': (1.15, .78),
    'secondary': (.8, .70), 'tertiary': (.45, .52),
}
buckets = {k: [] for k in TIER}
for w in roads:
    g = w.get('geometry')
    if not g: continue
    d = path(g)
    if d: buckets[w['tags']['highway']].append(d)

rivers, other_rivers, lakes = [], [], []
for w in water:
    g = w.get('geometry')
    if not g: continue
    t = w.get('tags', {})
    if t.get('waterway') == 'river':
        d = path(g)
        if not d: continue
        # only the Sabarmati gets to be the hero; Khari and Meshwa sit back
        (rivers if 'sabarmati' in (t.get('name') or '').lower() else other_rivers).append(d)
    else:
        d = path(g, close=True)
        if d: lakes.append(d)

out = []
add = out.append
add(f'''<defs>
<linearGradient id="riv" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
</linearGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="2.4" result="b"/><feMerge>
  <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>''')

add(f'<rect width="{W}" height="{H}" fill="#0d1117"/>')

# ---- road web, thinnest first so majors sit on top ----
add('<g id="roads" fill="none" stroke-linecap="round" stroke-linejoin="round">')
for k in ('tertiary', 'secondary', 'primary', 'trunk', 'motorway'):
    sw, op = TIER[k]
    col = '#8b97a6' if k in ('motorway', 'trunk') else '#5d6773'
    add(f'<g stroke="{col}" stroke-width="{sw}" opacity="{op}">')
    for d in buckets[k]:
        add(f'<path d="{d}"/>')
    add('</g>')
add('</g>')

# ---- water: the Sabarmati is the hero ----
add('<g id="water">')
add('<g fill="#9a3412" opacity="0.85" stroke="none">')
for d in lakes: add(f'<path d="{d}"/>')
add('</g>')
add('<g fill="none" stroke="#7c2d12" stroke-width="1.6" opacity="0.55" '
    'stroke-linecap="round" stroke-linejoin="round">')
for d in other_rivers: add(f'<path d="{d}"/>')
add('</g>')
add('<g id="sabarmati" fill="none" stroke="url(#riv)" stroke-width="3.4" '
    'stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">')
for d in rivers: add(f'<path d="{d}"/>')
add('</g></g>')

# ---- the walled city, the reason the post exists ----
ox, oy = px(72.5873, 23.0225)
add(f'<g id="oldcity"><circle cx="{ox:.0f}" cy="{oy:.0f}" r="46" fill="none" '
    f'stroke="#ffd7a3" stroke-width="1.2" stroke-dasharray="3 5" opacity="0.75"/>'
    f'<circle cx="{ox:.0f}" cy="{oy:.0f}" r="3" fill="#ffd7a3"/>'
    f'<text class="pin" x="{ox:.0f}" y="{oy-56:.0f}" text-anchor="middle">THE WALLED CITY</text></g>')

# ---- title block, poster convention ----
add(f'''<g id="title">
<rect x="48" y="44" width="330" height="132" fill="none" stroke="#e6edf3" stroke-width="1.4" opacity="0.85"/>
<text class="h" x="64" y="104">AHMEDABAD</text>
<text class="s" x="66" y="130">G U J A R A T &#183; I N D I A</text>
<text class="c" x="66" y="156">23&#176;01&#8242;N / 72&#176;35&#8242;E &#183; SABARMATI</text>
</g>''')

add(f'<rect x="0" y="{H-34}" width="{W}" height="34" fill="#0d1117" opacity="0.92"/>')
add(f'<text class="attr" x="20" y="{H-13}">map data &#169; OpenStreetMap contributors</text>')
add(f'<text class="mark" x="{W-20}" y="{H-13}" text-anchor="end">rushabhshah.dev</text>')

style = """<style>
  .h { font-family:'IBM Plex Sans Condensed','Space Grotesk',system-ui,sans-serif;
       font-size:44px; font-weight:700; letter-spacing:.02em; fill:#f0f6fc; }
  .s { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px;
       letter-spacing:.18em; fill:#fb923c; }
  .c { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10px;
       letter-spacing:.08em; fill:#8b949e; }
  .pin { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10px;
       letter-spacing:.2em; fill:#ffd7a3; opacity:.85; }
  .mark { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px;
       letter-spacing:.06em; fill:#8b949e; opacity:.6; }
  .attr { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px;
       letter-spacing:.04em; fill:#6e7681; opacity:.55; }
  #roads, #sabarmati, #oldcity { transition: opacity .5s ease, stroke-width .5s ease; }
  /* the river is the point of the picture, so hovering brings it forward */
  #amd-map:hover #roads   { opacity:.32; }
  #amd-map:hover #sabarmati { stroke-width:5; }
  #amd-map:hover #oldcity { opacity:1; }
  #oldcity { opacity:.62; }
  @media (prefers-reduced-motion: reduce) {
    #roads, #sabarmati, #oldcity { transition: none; }
  }
</style>"""

svg = (f'<svg id="amd-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
       f'width="{W}" height="{H}" role="img" aria-labelledby="m-t m-d">'
       f'<title id="m-t">Map of Ahmedabad, with the Sabarmati marked in orange</title>'
       f'<desc id="m-d">A street map of Ahmedabad drawn from OpenStreetMap data. The Sabarmati '
       f'river runs north to south through the centre in orange, dividing the newer west of the '
       f'city from the walled old city on the east bank, which is ringed and labelled.</desc>'
       + style + ''.join(out) + '</svg>')
open('amd-map.svg', 'w', encoding='utf-8').write(svg)
print(f'  wrote amd-map.svg  {len(svg)/1024:.0f} KB')
print(f'  roads drawn: {sum(len(v) for v in buckets.values())}   rivers: {len(rivers)}   lakes: {len(lakes)}')
