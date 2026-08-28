W, H = 1200, 520
MID = 600
o = []; add = o.append

style = """<style>
 :root{
   --paper:#f6f8fa; --ink:#1f2328; --muted:#57606a; --rule:#d0d7de;
   --cool:#0969da; --warm:#bc4c00; --panel:#ffffff;
 }
 @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
   --paper:#0d1117; --ink:#e6edf3; --muted:#8b949e; --rule:#30363d;
   --cool:#58a6ff; --warm:#e3a03c; --panel:#161b22;
 }}
 :root[data-theme="dark"]{
   --paper:#0d1117; --ink:#e6edf3; --muted:#8b949e; --rule:#30363d;
   --cool:#58a6ff; --warm:#e3a03c; --panel:#161b22;
 }
 .bg{fill:var(--paper)} .panel{fill:var(--panel)} .rule{stroke:var(--rule)}
 .eyebrow{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;letter-spacing:.16em;fill:var(--muted)}
 .head{font-family:'IBM Plex Sans Condensed','Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:27px;fill:var(--ink)}
 .guj{font-family:'Noto Sans Gujarati','Shruti',system-ui,sans-serif;font-size:25px;font-weight:600;fill:var(--warm)}
 .k{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;fill:var(--muted)}
 .v{font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:15.5px;font-weight:600;fill:var(--ink)}
 .big{font-family:'IBM Plex Sans Condensed',system-ui,sans-serif;font-size:56px;font-weight:700;fill:var(--cool)}
 .bigw{font-family:'IBM Plex Sans Condensed',system-ui,sans-serif;font-size:34px;font-weight:700;fill:var(--warm)}
 .note{font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:14px;fill:var(--muted)}
 .mark{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;fill:var(--muted);opacity:.7}
 .brolly{stroke:var(--warm);fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
 .rain{stroke:var(--cool);stroke-width:1.8;stroke-linecap:round;opacity:.5}
 @media (prefers-reduced-motion:no-preference){
   .rain{animation:fall 1.4s linear infinite}
   @keyframes fall{from{transform:translateY(-14px)}to{transform:translateY(14px)}}
 }
</style>
<script><![CDATA[
(function(){try{var h=window.parent&&window.parent.document&&window.parent.document.documentElement;
if(!h||h===document.documentElement)return;var s=function(){var t=h.getAttribute('data-theme');
if(t)document.documentElement.setAttribute('data-theme',t);else document.documentElement.removeAttribute('data-theme');};
s();new MutationObserver(s).observe(h,{attributes:true,attributeFilter:['data-theme']});}catch(e){}})();
]]></script>"""

add(f'<rect class="bg" width="{W}" height="{H}" rx="14"/>')
add(f'<line class="rule" x1="{MID}" y1="54" x2="{MID}" y2="{H-64}" stroke-width="1.2" stroke-dasharray="5 6"/>')

# ---------- left: the official forecast ----------
add('<text class="eyebrow" x="56" y="72">THE FORECAST</text>')
add('<text class="head" x="56" y="112">Saturday, 19 September</text>')
add('<text class="big" x="56" y="196">33&#8211;34&#176;C</text>')
add('<text class="k" x="56" y="226">daytime high</text>')
rows = [('overnight low', '26 to 28°C'), ('humidity', 'around 71%'),
        ('wind', '3 to 4 m/s'), ('sunrise / sunset', '06:26 / 18:40'),
        ('conditions', 'sun, cloud, passing showers')]
y = 272
for k, v in rows:
    add(f'<text class="k" x="56" y="{y}">{k}</text>')
    add(f'<text class="v" x="230" y="{y}">{v}</text>')
    y += 32
add(f'<text class="note" x="56" y="{H-84}">Late monsoon. The numbers are real and</text>')
add(f'<text class="note" x="56" y="{H-64}">they are also, locally, only advisory.</text>')

# ---------- right: the local method ----------
add(f'<text class="eyebrow" x="{MID+56}" y="72">WHAT GUJARAT ACTUALLY CHECKS</text>')
add(f'<text class="guj" x="{MID+56}" y="112">&#2693;&#2690;&#2732;&#2750;&#2738;&#2750;&#2738; &#2709;&#2750;&#2709;&#2750;</text>')
add(f'<text class="head" x="{MID+56}" y="146" style="font-size:19px">Ambalal kaka</text>')

# umbrella
cx, cy = MID + 300, 268
add(f'<path class="brolly" d="M{cx-92} {cy} a92 92 0 0 1 184 0"/>')
add(f'<path class="brolly" d="M{cx-92} {cy} q23 -26 46 0 q23 -26 46 0 q23 -26 46 0 q23 -26 46 0"/>')
add(f'<path class="brolly" d="M{cx} {cy-92} V{cy+86}"/>')
add(f'<path class="brolly" d="M{cx} {cy+86} a15 15 0 0 0 30 0"/>')
for i, dx in enumerate((-150, -112, -74, 74, 112, 150)):
    add(f'<line class="rain" x1="{cx+dx}" y1="{cy-40+ (i%3)*26}" x2="{cx+dx-7}" y2="{cy-16+(i%3)*26}" '
        f'style="animation-delay:{i*0.19:.2f}s"/>')

add(f'<text class="bigw" x="{MID+56}" y="{H-124}">Bring the umbrella.</text>')
add(f'<text class="note" x="{MID+56}" y="{H-92}">Ambalal Patel is a Gujarati weather forecaster whose rain</text>')
add(f'<text class="note" x="{MID+56}" y="{H-72}">predictions get their own news coverage. Half of Gujarat</text>')
add(f'<text class="note" x="{MID+56}" y="{H-52}">checks him before it checks the official bulletin.</text>')

add(f'<text class="mark" x="{W-18}" y="{H-18}" text-anchor="end">rushabhshah.dev</text>')

svg = (f'<svg id="amd-weather" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" '
       f'height="{H}" role="img" aria-labelledby="w-t w-d">'
       f'<title id="w-t">The forecast for 19 September, and what Gujarat actually checks</title>'
       f'<desc id="w-d">Two panels. On the left, the official forecast for Saturday 19 September in '
       f'Ahmedabad: a high of 33 to 34 degrees, an overnight low of 26 to 28, humidity around 71 per '
       f'cent, light wind, sunrise 06:26 and sunset 18:40, with sun, cloud and passing showers. On the '
       f'right, an umbrella in the rain under the name Ambalal kaka, a Gujarati weather forecaster '
       f'whose rain predictions are followed closely across the state, with the advice to bring an '
       f'umbrella anyway.</desc>' + style + ''.join(o) + '</svg>')
open('amd-weather.svg', 'w', encoding='utf-8').write(svg)
print(f'  wrote amd-weather.svg  {len(svg)/1024:.1f} KB')
