import random
random.seed(1947)
W, H = 1200, 520
GROUND = 430          # waterline
RIV_L, RIV_R = 486, 714   # river banks at the top of the frame

out = []
add = out.append

# ---------- defs ----------
add(f'''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0"    stop-color="#141d33"/>
  <stop offset="0.34" stop-color="#4a2a4d"/>
  <stop offset="0.62" stop-color="#a4474a"/>
  <stop offset="0.84" stop-color="#e07a3a"/>
  <stop offset="1"    stop-color="#f6b45f"/>
</linearGradient>
<linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0"    stop-color="#ffcf8a"/>
  <stop offset="0.28" stop-color="#fb923c"/>
  <stop offset="0.68" stop-color="#ea580c"/>
  <stop offset="1"    stop-color="#9a3412"/>
</linearGradient>
<linearGradient id="newCity" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#1d2a3d"/><stop offset="1" stop-color="#0e1622"/>
</linearGradient>
<linearGradient id="oldCity" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#33202a"/><stop offset="1" stop-color="#1a1016"/>
</linearGradient>
<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffe6b0" stop-opacity="0.95"/>
  <stop offset="1" stop-color="#ffb347" stop-opacity="0"/>
</radialGradient>
</defs>''')

# ---------- sky + sun ----------
add(f'<rect width="{W}" height="{GROUND}" fill="url(#sky)"/>')
add(f'<circle cx="600" cy="{GROUND-40}" r="165" fill="url(#sun)"/>')
add(f'<circle cx="600" cy="{GROUND-44}" r="30" fill="#ffdc9c" opacity="0.92"/>')

# ---------- Sidi Saiyyed jali roundel, over the old city ----------
def jali(cx, cy, r):
    p = [f'<g opacity="0.30" stroke="#ffd9a0" fill="none" stroke-width="1.6">',
         f'<circle cx="{cx}" cy="{cy}" r="{r}"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r-7}" stroke-width="1"/>']
    # stylised tree lattice: a trunk and interlacing branches
    p.append(f'<path d="M{cx} {cy+r-9} V{cy-4}" stroke-width="2"/>')
    for i, (dx, dy, rr) in enumerate([(-1,0,15),(1,0,15),(-1,-1,11),(1,-1,11),(0,-1,9)]):
        bx, by = cx + dx*rr, cy - 6 + dy*rr
        p.append(f'<path d="M{cx} {cy+4} Q{cx+dx*rr*0.5} {cy-2} {bx} {by}"/>')
        p.append(f'<circle cx="{bx}" cy="{by}" r="{7-i*0.6:.1f}" stroke-width="1"/>')
    p.append('</g>')
    return ''.join(p)
add(jali(985, 128, 46))

# ================= NEW AHMEDABAD (west bank, left) =================
add('<g id="side-new">')
add(f'<rect class="hit" x="0" y="0" width="{RIV_L}" height="{GROUND}" fill="transparent"/>')
towers = [(28,250,44),(78,196,38),(122,286,34),(162,150,46),(214,224,40),
          (260,120,52),(318,206,42),(366,262,36),(408,176,44),(452,240,30)]
for x, top, w in towers:
    h = GROUND - top
    add(f'<rect x="{x}" y="{top}" width="{w}" height="{h}" fill="url(#newCity)"/>')
    if w > 40:  # slim antenna on the taller slabs
        add(f'<rect x="{x+w/2-1}" y="{top-22}" width="2" height="22" fill="#1d2a3d"/>')
    # lit windows
    for row in range(int(h//22)):
        for col in range(int(w//14)):
            if random.random() < 0.34:
                add(f'<rect x="{x+5+col*14}" y="{top+9+row*22}" width="4" height="6" '
                    f'fill="#ffc978" opacity="{0.25+random.random()*0.5:.2f}"/>')
add('</g>')

# ================= OLD AHMEDABAD (east bank, right) =================
add('<g id="side-old">')
add(f'<rect class="hit" x="{RIV_R}" y="0" width="{W-RIV_R}" height="{GROUND}" fill="transparent"/>')
O = 'url(#oldCity)'
# Bhadra Fort: crenellated wall + arched gate
add(f'<rect x="742" y="300" width="150" height="{GROUND-322}" fill="{O}"/>')
for i in range(10):
    add(f'<rect x="{744+i*15}" y="290" width="9" height="12" fill="{O}"/>')
add(f'<path d="M796 {GROUND} v-58 a22 22 0 0 1 44 0 v58 z" fill="#120b10"/>')
# Teen Darwaza: three arches
add(f'<rect x="900" y="336" width="118" height="{GROUND-336}" fill="{O}"/>')
for i in range(3):
    ax = 913 + i*38
    add(f'<path d="M{ax} {GROUND} v-46 a14 14 0 0 1 28 0 v46 z" fill="#120b10"/>')
# Jama Masjid: minarets, domes, plinth
add(f'<rect x="1030" y="330" width="150" height="{GROUND-330}" fill="{O}"/>')
for mx in (1036, 1166):
    add(f'<rect x="{mx}" y="238" width="14" height="96" fill="{O}"/>')
    add(f'<path d="M{mx-3} 238 h20 l-10 -20 z" fill="{O}"/>')
    add(f'<circle cx="{mx+7}" cy="212" r="4" fill="{O}"/>')
for dx, dr in ((1075, 26), (1128, 26), (1101, 34)):
    add(f'<path d="M{dx-dr} 330 a{dr} {dr} 0 0 1 {dr*2} 0 z" fill="{O}"/>')
    add(f'<rect x="{dx-2}" y="{330-dr-14}" width="4" height="14" fill="{O}"/>')
# pol houses along the bank, with the carved-balcony hint
for i, px in enumerate((722, 766, 810, 854)):
    ht = 46 + (i % 2) * 10
    add(f'<rect x="{px}" y="{GROUND-ht}" width="38" height="{ht}" fill="#231620"/>')
    add(f'<path d="M{px-4} {GROUND-ht} h46 l-23 -16 z" fill="#231620"/>')
    add(f'<rect x="{px+5}" y="{GROUND-ht+14}" width="28" height="3" fill="#3d2733"/>')
    add(f'<rect x="{px+12}" y="{GROUND-ht+22}" width="6" height="10" fill="#ffbe6e" opacity="0.5"/>')
add('</g>')

# ---------- ground on both banks ----------
add(f'<rect x="0" y="{GROUND}" width="{W}" height="{H-GROUND}" fill="#150d14"/>')
add(f'<rect x="0" y="{GROUND}" width="{W}" height="3" fill="#c2410c" opacity="0.45"/>')

# ================= THE SABARMATI =================
add(f'<path d="M552 {GROUND} L648 {GROUND} L{RIV_R+118} {H} L{RIV_L-118} {H} Z" fill="url(#river)"/>')
# riverfront promenade steps on both banks
for i in range(5):
    y = GROUND + i*18
    lx = 552 - (552-(RIV_L-118)) * (i/4.0)
    rx = 648 + ((RIV_R+118)-648) * (i/4.0)
    add(f'<path d="M{lx:.0f} {y} h-34" stroke="#7c2d12" stroke-width="2" opacity="0.45"/>')
    add(f'<path d="M{rx:.0f} {y} h34" stroke="#7c2d12" stroke-width="2" opacity="0.45"/>')
# shimmer
add('<g class="shimmer" stroke="#ffe0b0" stroke-linecap="round" fill="none">')
for i in range(16):
    if 11 <= i <= 13: continue
    y = GROUND + 6 + i*7
    hw = 26 + i*7.2
    x0 = 600 - hw + random.random()*20
    add(f'<path d="M{x0:.0f} {y} h{hw*random.uniform(.5,1.3):.0f}" stroke-width="{1.4 if i%3 else 2.2}" '
        f'opacity="{0.5-i*0.024:.2f}"/>')
add('</g>')

# Atal Bridge: the new pedestrian span, tying the two halves together
add('<g id="bridge">')
add(f'<path d="M508 452 Q600 404 692 452" stroke="#ffdca8" stroke-width="5" fill="none"/>')
add(f'<path d="M508 464 Q600 416 692 464" stroke="#c2410c" stroke-width="4" fill="none" opacity="0.85"/>')
for i in range(13):
    t = i/12
    x = 508 + t*184
    y = 452 - 48*(4*t*(1-t))
    add(f'<path d="M{x:.0f} {y:.0f} v12" stroke="#ffcf95" stroke-width="1.6" opacity="0.75"/>')
add('</g>')

# ---------- labels ----------
add(f'<text class="lbl lbl-new" x="40" y="468">NEW AHMEDABAD</text>')
add(f'<text class="sub sub-new" x="40" y="487">west bank &#183; riverfront, towers, SG Highway</text>')
add(f'<text class="lbl lbl-old" x="{W-40}" y="468" text-anchor="end">OLD AHMEDABAD</text>')
add(f'<text class="sub sub-old" x="{W-40}" y="487" text-anchor="end">east bank &#183; the walled city, 600 years of pols</text>')
add(f'<text class="river-lbl" x="600" y="502" text-anchor="middle">SABARMATI</text>')
add(f'<text class="mark" x="{W-16}" y="{H-11}" text-anchor="end">rushabhshah.dev</text>')

style = """
<style>
  #amd-hero { --dim: 1; }
  .lbl  { font-family: 'IBM Plex Sans Condensed', 'Space Grotesk', system-ui, sans-serif;
          font-size: 19px; font-weight: 700; letter-spacing: .13em; fill: #ffe9c6; }
  .sub  { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px;
          letter-spacing: .04em; fill: #d9a878; }
  .river-lbl { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px;
          letter-spacing: .38em; fill: #4a1505; opacity: .72; font-weight: 500; }
  .mark { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px;
          letter-spacing: .06em; fill: #c98a52; opacity: .55; }
  #side-new, #side-old { transition: opacity .45s ease; }
  .lbl, .sub { transition: fill .45s ease, opacity .45s ease; }
  /* hovering one bank quietens the other, so the split reads on contact */
  #amd-hero:hover #side-new, #amd-hero:hover #side-old { opacity: .34; }
  #amd-hero #side-new:hover, #amd-hero #side-old:hover { opacity: 1; }
  #amd-hero:has(#side-new:hover) .lbl-new,
  #amd-hero:has(#side-old:hover) .lbl-old { fill: #fff4de; }
  #amd-hero:has(#side-new:hover) .lbl-old,
  #amd-hero:has(#side-new:hover) .sub-old,
  #amd-hero:has(#side-old:hover) .lbl-new,
  #amd-hero:has(#side-old:hover) .sub-new { opacity: .3; }
  .shimmer path { animation: drift 9s ease-in-out infinite alternate; }
  @keyframes drift { from { transform: translateX(-7px); } to { transform: translateX(7px); } }
  @media (prefers-reduced-motion: reduce) { .shimmer path { animation: none; } }
</style>
"""

svg = (f'<svg id="amd-hero" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
       f'width="{W}" height="{H}" role="img" aria-labelledby="amd-t amd-d">'
       f'<title id="amd-t">Ahmedabad at sunset, split by the Sabarmati</title>'
       f'<desc id="amd-d">The Sabarmati river runs down the centre in sunset orange. On the west '
       f'bank to the left, the towers of new Ahmedabad. On the east bank to the right, the walled '
       f'old city: Bhadra Fort, Teen Darwaza, the domes and minarets of Jama Masjid, and pol houses '
       f'along the water. The Atal Bridge crosses between them, and the Sidi Saiyyed jali hangs in '
       f'the sky above the old city.</desc>'
       + style + ''.join(out) + '</svg>')
open('amd-hero.svg', 'w', encoding='utf-8').write(svg)
print(f'  wrote amd-hero.svg  {len(svg)/1024:.1f} KB')
