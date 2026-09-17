#!/usr/bin/env python3
"""Hero / social card for the DNS storm postmortem.

Same furniture as `og-card.py` (mesh, hex lattice, vignette, grain, monogram),
imported rather than copied so the two cannot drift, but the right half is not
decoration: it is the actual `EAI_AGAIN` count per hour through the outage
window, from the log scan the post is written from. Three flat hours, then a
wall. That shape is the whole story, so it belongs on the card.

The hue pair is warm on purpose. Every other card takes its colour from the
post's rarest tag; an incident post has no entry in that table and the fallback
is the same blue as everything else, which is the wrong signal for a postmortem.

    python3 -m venv .venv && .venv/bin/pip install fonttools brotli pillow
    .venv/bin/python diagrams/dns-storm-hero.py

Writes /assets/blog/dns-storm-og.jpg (1200x630), which is the post's `cover` and
therefore its hero, its og:image and its thumbnail on /blog/.
"""
import importlib.util
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "blog", "dns-storm-og.jpg")

# og-card.py is not importable by name (the dash), and it is the right place for
# these helpers to live, so load it as a module rather than duplicating them.
_spec = importlib.util.spec_from_file_location(
    "ogcard", os.path.join(os.path.dirname(os.path.abspath(__file__)), "og-card.py"))
og = importlib.util.module_from_spec(_spec)
sys.modules["ogcard"] = og
_spec.loader.exec_module(og)

W, H, PAD = og.W, og.H, og.PAD
WHITE, MUTED = og.WHITE, og.MUTED
AMBER = (244, 123, 32)
ROSE = (219, 63, 110)
SEED = "dns-storm-eai-again"

TITLE = "A hostname that\nnever existed"
EYEBROW = "#INCIDENT  ·  #DNS"

# getaddrinfo EAI_AGAIN per hour, 26 Aug 14:00 to 27 Aug 05:00. The zeroes are
# real: the box was quiet, and then it was not.
SERIES = [
    ("14", 4), ("15", 268), ("16", 75), ("17", 0), ("18", 0), ("19", 0),
    ("20", 0), ("21", 0), ("22", 11287), ("23", 14362), ("00", 14364),
    ("01", 5711), ("02", 0), ("03", 0), ("04", 0), ("05", 3063),
]


def chart(img):
    """Bars for the outage window, right half of the card.

    Linear, not log. A log axis would make the three quiet hours legible and
    destroy the only thing the card is for, which is the size of the step."""
    d = ImageDraw.Draw(img, "RGBA")
    x0, x1 = 648, W - PAD
    base, top = 486, 236
    n = len(SERIES)
    slot = (x1 - x0) / n
    bw = slot * 0.62
    peak = max(v for _, v in SERIES)

    label = og.load_font("fira-code-var.woff2", 21, 500)
    d.text((x0, 146), "getaddrinfo EAI_AGAIN, per hour", font=label, fill=AMBER)

    d.line([x0, base + 1, x1, base + 1], fill=(255, 255, 255, 46), width=2)

    hour = og.load_font("fira-code-var.woff2", 17, 400)
    for i, (hh, v) in enumerate(SERIES):
        cx = x0 + i * slot + (slot - bw) / 2
        d.text((cx + bw / 2 - d.textlength(hh, font=hour) / 2, base + 12),
               hh, font=hour, fill=(120, 131, 145))
        if v == 0:
            # a zero still needs to occupy its slot, or the gap reads as missing
            # data rather than as quiet
            d.line([cx, base - 1, cx + bw, base - 1], fill=ROSE + (150,), width=3)
            continue
        h = max(4, (v / peak) * (base - top))
        col = AMBER if v > peak * 0.3 else ROSE
        d.rectangle([cx, base - h, cx + bw, base], fill=col + (34,))
        d.rectangle([cx, base - h, cx + bw, base - h + 3], fill=col + (255,))
        d.rectangle([cx, base - h, cx + bw, base], outline=col + (170,), width=2)

    peak_i = [v for _, v in SERIES].index(peak)
    px = x0 + peak_i * slot + slot / 2
    ann = og.load_font("fira-code-var.woff2", 22, 600)
    t = f"{peak:,}"
    d.text((px - d.textlength(t, font=ann) / 2, top - 32), t, font=ann, fill=WHITE)

    foot = og.load_font("fira-code-var.woff2", 18, 400)
    d.text((x0, base + 44), "26 Aug 14:00  ->  27 Aug 05:00", font=foot, fill=MUTED)
    return img


def text_block(img):
    d = ImageDraw.Draw(img)
    eb = og.load_font("fira-code-var.woff2", 24, 500)
    d.text((PAD, PAD + 4), EYEBROW, font=eb, fill=AMBER)
    d.line([PAD, PAD + 40, PAD + 52, PAD + 40], fill=AMBER, width=3)

    g = og.load_font("space-grotesk-var.woff2", 74, 700)
    lines = TITLE.split("\n")
    step = int(74 * 1.16)
    y = int(H * 0.50 - len(lines) * step / 2) - 6
    for ln in lines:
        d.text((PAD + 2, y + 3), ln, font=g, fill=(0, 0, 0, 120))
        d.text((PAD, y), ln, font=g, fill=WHITE)
        y += step

    sub = og.load_font("fira-code-var.woff2", 22, 400)
    d.text((PAD, y + 14), "46 lookups/sec  ·  28% of the ENI budget", font=sub, fill=MUTED)

    og.monogram(d, PAD, H - PAD - 18, AMBER)
    return img


def build():
    img = og.mesh(SEED, AMBER, ROSE)
    img = og.hexlattice(img, AMBER, SEED, start=0.02, alpha=0.34)
    img = og.vignette(img)
    img = og.scrim(img, frac=0.58)
    img = chart(img)
    img = text_block(img)
    img = og.grain(img)
    return img.convert("RGB")


if __name__ == "__main__":
    build().save(OUT, "JPEG", quality=90, optimize=True)
    print(f"wrote /assets/blog/dns-storm-og.jpg ({os.path.getsize(OUT)//1024}KB)")
