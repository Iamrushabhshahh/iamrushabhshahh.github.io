#!/usr/bin/env python3
"""Hero / social card for the KCD Gujarat post.

The city half is not decoration: it is `assets/blog/ahmedabad-map.svg`, the same
OpenStreetMap extract the post uses as a figure, rasterised and faded to the
right. It dissolves into the hexagonal lattice that `og-card.py` puts on every
other post's card, so this post reads as part of the set while still being the
one with a real map on it.

The map SVG is theme-reactive (CSS custom properties plus a `data-theme` script),
and ImageMagick can resolve neither, so the palette is flattened to literals and
every text element stripped before rasterising. Hence the preprocessing step
rather than rendering the SVG as-is.

    python3 -m venv .venv && .venv/bin/pip install fonttools brotli pillow
    .venv/bin/python diagrams/kcd-hero.py

Writes /assets/blog/kcd-gujarat-og.jpg (1200x630), which is the post's `cover`
and therefore its hero, its og:image and its thumbnail on /blog/.
"""
import io
import math
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("need fonttools + brotli: python3 -m venv .venv && "
             ".venv/bin/pip install fonttools brotli pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "assets", "fonts")
MAP_SVG = os.path.join(ROOT, "assets", "blog", "ahmedabad-map.svg")
OUT = os.path.join(ROOT, "assets", "blog", "kcd-gujarat-og.jpg")

W, H = 1200, 630
# Everything is drawn at 2x and downsampled once at the end. Type and the thin
# hex strokes are the reason: rendered straight at 1200px they alias, and the
# grain then has nothing clean to sit on.
SS = 2
PAD = 76
TEAL = (34, 182, 190)
BLUE = (88, 166, 255)
WHITE = (255, 255, 255)
MUTED = (150, 161, 174)

EYEBROW = "AHMEDABAD  ·  19 SEPTEMBER 2026"
TITLE = ["Gujarat's first", "Kubernetes", "Community Day"]

# Flat dark palette standing in for the SVG's custom properties.
FLAT_STYLE = """<style>
 .paper{fill:#080d14}
 .r-min,.r-mid,.r-maj{fill:none}
 .r-min{stroke:#5b6673} .r-mid{stroke:#8b97a5} .r-maj{stroke:#c9d4e0}
 .w-riv{stroke:#58a6ff} .w-lake{fill:#58a6ff} .w-oth{stroke:#2d4a6b}
</style>"""


def load_font(name, size, weight=None):
    tt = TTFont(os.path.join(FONTS, name))
    buf = io.BytesIO()
    tt.flavor = None
    tt.save(buf)
    buf.seek(0)
    font = ImageFont.truetype(buf, size)
    if weight is not None:
        try:
            font.set_variation_by_axes([weight])
        except Exception:
            pass
    return font


def px(v):
    """Scale a 1x design coordinate up to the supersampled canvas."""
    return int(round(v * SS))


def rasterise_map():
    svg = open(MAP_SVG, encoding="utf-8").read()
    svg = re.sub(r"<style>[\s\S]*?</style>", FLAT_STYLE, svg, count=1)
    # ImageMagick parses <text> even when CSS hides it, and then fails looking
    # for a font it has no handle on. Strip the lot; the type is drawn in PIL.
    for pat in (r"<text[\s\S]*?</text>", r"<title[\s\S]*?</title>",
                r"<desc[\s\S]*?</desc>", r"<script[\s\S]*?</script>",
                r'<rect class="box"[^>]*/>'):
        svg = re.sub(pat, "", svg)
    with tempfile.TemporaryDirectory() as tmp:
        flat = os.path.join(tmp, "flat.svg")
        png = os.path.join(tmp, "map.png")
        open(flat, "w", encoding="utf-8").write(svg)
        # density high enough that the street mesh survives the 2x canvas
        subprocess.run(["magick", "-background", "none", "-density", "320",
                        flat, "-resize", f"{W * SS}x{H * SS}", png], check=True)
        return Image.open(png).convert("RGBA").resize((W * SS, H * SS), Image.LANCZOS)


def glow(img, cx, cy, r, colour, alpha):
    cx, cy, r = px(cx), px(cy), px(r)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r // 2)))


def glass_tile(img, box, radius, tint, border, strength=1.9):
    """Frosted-glass panel: blur what is already behind it, lift it slightly,
    then lay a translucent tint and a bright top edge over the top. Keeps the
    river and street mesh readable through the monogram instead of punching a
    solid hole in the artwork."""
    x0, y0, x1, y1 = box
    region = img.crop(box).convert("RGB").filter(ImageFilter.GaussianBlur(px(7)))
    region = ImageEnhance.Brightness(region).enhance(1.35)
    region = ImageEnhance.Color(region).enhance(1.15)
    panel = region.convert("RGBA")
    panel.alpha_composite(Image.new("RGBA", panel.size, tint))

    mask = Image.new("L", panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=radius, fill=255)
    img.paste(panel, (x0, y0), mask)

    # Border, then a top-edge highlight. The highlight is a second rounded
    # rectangle masked to its upper half, NOT an arc: an ellipse arc inscribed in
    # a rounded square does not follow the border and leaves a stray curve
    # poking out past the corners.
    edge = Image.new("RGBA", panel.size, (0, 0, 0, 0))
    ed = ImageDraw.Draw(edge)
    w = max(1, px(1))
    ed.rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=radius,
                         outline=(214, 248, 250, 165), width=w)
    fade = Image.new("L", panel.size, 0)
    fd = ImageDraw.Draw(fade)
    for yy in range(panel.size[1]):
        fd.line([(0, yy), (panel.size[0], yy)],
                fill=int(210 * max(0.0, 1 - yy / (panel.size[1] * 0.62))))
    edge.putalpha(ImageChops.multiply(edge.split()[3], fade))
    img.alpha_composite(edge, (x0, y0))

    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius, outline=border, width=w)


def build():
    CW, CH = W * SS, H * SS
    img = Image.new("RGBA", (CW, CH), (8, 13, 20, 255))

    # City on the left, dissolving right so the lattice has somewhere to start.
    city = rasterise_map()
    ramp = Image.new("L", (CW, CH), 0)
    rd = ImageDraw.Draw(ramp)
    for x in range(CW):
        rd.line([(x, 0), (x, CH)],
                fill=max(0, min(255, int(255 * (1 - (x - CW * 0.30) / (CW * 0.34))))))
    city.putalpha(ImageChops.multiply(city.split()[3], ramp))
    img.alpha_composite(city)

    glow(img, 300, 300, 300, BLUE, 55)
    glow(img, 980, 240, 320, TEAL, 70)

    lattice = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lattice)
    R = px(54)
    dx, dy = R * 1.5, R * math.sqrt(3)
    lit = {(1, 2), (2, 0), (3, 3), (0, 5), (4, 1), (2, 4)}
    for i in range(10):
        for j in range(-1, 8):
            cx = CW * 0.60 + i * dx
            cy = j * dy + (dy / 2 if i % 2 else 0)
            if cx - R > CW + px(60):
                continue
            fade = max(0.0, min(1.0, (cx - CW * 0.56) / (CW * 0.42)))
            pts = [(cx + R * math.cos(math.radians(60 * k)),
                    cy + R * math.sin(math.radians(60 * k))) for k in range(6)]
            a = int(28 + 150 * fade)
            if (i, j) in lit:
                ld.polygon(pts, fill=TEAL + (int(26 + 55 * fade),),
                           outline=TEAL + (min(255, a + 90),), width=max(1, px(1)))
            else:
                ld.polygon(pts, outline=TEAL + (a,), width=max(1, px(1)))
    img.alpha_composite(lattice.filter(ImageFilter.GaussianBlur(px(9))))
    img.alpha_composite(lattice)

    # Darken under the type; the street mesh is busy and the title has to win.
    sc = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for i in range(60):
        sd.rectangle([0, 0, int(CW * 0.62 * (i / 60) + CW * 0.08), CH], fill=(4, 8, 14, 9))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(px(34))))

    d = ImageDraw.Draw(img)
    eb = load_font("fira-code-var.woff2", px(24), 500)
    d.text((px(PAD), px(86)), EYEBROW, font=eb, fill=TEAL)
    d.line([px(PAD), px(122), px(PAD + 52), px(122)], fill=TEAL, width=px(3))

    g = load_font("space-grotesk-var.woff2", px(78), 700)
    y = px(232)
    for line in TITLE:
        d.text((px(PAD), y), line, font=g, fill=WHITE)
        y += px(92)

    # Monogram on a frosted panel rather than a solid tile, so the river and the
    # streets stay visible straight through it.
    sz = px(40)
    mx, my = px(PAD), px(H - 98)
    glass_tile(img, (mx, my, mx + sz, my + sz), radius=px(11),
               tint=(34, 182, 190, 46), border=(120, 226, 232, 150))
    mf = load_font("fira-code-var.woff2", px(26), 700)
    d = ImageDraw.Draw(img)
    d.text((mx + sz / 2 - d.textlength("R", font=mf) / 2, my + px(5)),
           "R", font=mf, fill=(214, 248, 250))
    d.text((mx + sz + px(15), my + px(9)), "rushabhshah.dev",
           font=load_font("fira-code-var.woff2", px(22), 400), fill=(196, 208, 220))

    # One downsample at the end does the antialiasing for type and hex strokes
    # alike, then a whisper of grain so the wide gradients do not band.
    img = img.convert("RGB").resize((W, H), Image.LANCZOS)
    noise = Image.effect_noise((W, H), 4).convert("L")
    return Image.blend(img, ImageChops.overlay(img, Image.merge("RGB", (noise,) * 3)), 0.5)


if __name__ == "__main__":
    build().save(OUT, "JPEG", quality=95, optimize=True, subsampling=0)
    print(f"wrote {OUT.replace(ROOT, '')}  ({os.path.getsize(OUT) // 1024}KB)")
