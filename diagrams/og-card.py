#!/usr/bin/env python3
"""Social cards for posts that don't have a hand-made one.

Two posts have purpose-built cards (the Ahmedabad map, the Garhwal logo). The
rest had nothing, which meant every share of them on LinkedIn or X fell back to
the generic site card. This renders one 1200x630 card per post from the post's
own front matter, in the site's own colours and fonts, so a blog index of mixed
posts reads as one set instead of two illustrated posts and a row of blanks.

The art is a two-hue gradient mesh with a lit hexagonal lattice bleeding off the
right edge, plus a vignette, a left scrim and film grain. Hue comes from the
post's rarest tag, and the mesh and the lit cells are seeded from the slug, so
every card is recognisably the same series but none of them are twins.

A previous revision set a "subject" from the title alongside it — the price, the
exam acronym. It was dropped: the title already contains those words, so the
card said "$250" twice and the squeezed title column cost more than the subject
added.

It deliberately reuses `assets/fonts/*.woff2` rather than shipping its own
fonts: the cards then can't drift from the typography on the site itself.

    python3 -m venv .venv && .venv/bin/pip install fonttools brotli pillow
    .venv/bin/python diagrams/og-card.py            # only posts missing a cover
    .venv/bin/python diagrams/og-card.py --all      # every post, overwriting

Writes /assets/blog/og/<slug>.jpg and prints the `cover:` line each post needs.
Pass --write-frontmatter to have it insert those lines for you.
"""
import argparse
import io
import math
import os
import random
import re
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("need fonttools + brotli: python3 -m venv .venv && "
             ".venv/bin/pip install fonttools brotli pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")
FONTS = os.path.join(ROOT, "assets", "fonts")
OUT = os.path.join(ROOT, "assets", "blog", "og")

W, H = 1200, 630
PAD = 76
MUTED = (148, 158, 170)
WHITE = (255, 255, 255)

# accent pairs: (primary, secondary) for a two-hue mesh
PAIR={"certification":((163,113,247),(56,139,253)),
      "releases":((244,123,32),(219,63,110)),
      "community":((45,183,120),(56,139,253)),
      "kcd":((45,183,120),(56,139,253)),
      "open-source":((56,139,253),(45,183,120)),
      "cncf":((56,139,253),(163,113,247)),
      "meta":((34,182,190),(56,139,253)),
      "blog":((34,182,190),(56,139,253)),
      "kubernetes":((56,139,253),(163,113,247))}
# Rarest-tag-first: nearly every post is tagged `kubernetes`, so keying off the
# first tag painted the whole index one shade of blue.
ORDER=["releases","kcd","community","certification","open-source","cncf","meta","blog","kubernetes"]

def load_font(name,size,weight=None):
    """PIL cannot read woff2, so decompress to an in-memory TTF first. These are
    variable fonts; `weight` picks an instance off the wght axis."""
    tt=TTFont(os.path.join(FONTS,name)); b=io.BytesIO(); tt.flavor=None; tt.save(b); b.seek(0)
    f=ImageFont.truetype(b,size)
    if weight:
        try: f.set_variation_by_axes([weight])
        except Exception: pass
    return f

def pair(tags):
    for t in ORDER:
        if t in tags: return PAIR[t]
    return ((56,139,253),(163,113,247))

def greedy(d,text,f,maxw):
    ws,ls,l=text.split(),[],""
    for w_ in ws:
        t=f"{l} {w_}".strip()
        if d.textlength(t,font=f)<=maxw or not l: l=t
        else: ls.append(l); l=w_
    if l: ls.append(l)
    return ls

def wrap(d,text,f,maxw):
    """Greedy wrapping strands short words ("and" alone on a line). Once the
    line count is fixed, squeeze the width down as far as it will go without
    adding a line: that redistributes words and evens the ragged edge."""
    lines=greedy(d,text,f,maxw)
    n=len(lines)
    if n<2: return lines
    lo,hi=int(maxw*0.55),int(maxw)
    while lo<hi:
        mid=(lo+hi)//2
        if len(greedy(d,text,f,mid))<=n: hi=mid
        else: lo=mid+1
    return greedy(d,text,f,lo)

def mesh(seed,c1,c2):
    """Deep two-hue gradient mesh. Painted small then upscaled: a 60px canvas
    blurred and enlarged gives a far smoother falloff than blurring at 1200px."""
    r=random.Random(seed); s=60
    base=Image.new("RGB",(s,int(s*H/W)),(4,7,14))
    d=ImageDraw.Draw(base)
    blobs=[(0.78,0.16,0.42,c1,1.0),(0.95,0.62,0.40,c2,0.75),(0.62,0.95,0.36,c1,0.5),
           (0.20,0.10,0.30,c2,0.28)]
    for fx,fy,fr,col,inten in blobs:
        fx+=r.uniform(-0.05,0.05); fy+=r.uniform(-0.05,0.05)
        cx,cy,rr=fx*base.width,fy*base.height,fr*base.width
        for i in range(14,0,-1):
            k=i/14.0
            a=inten*(1-k)**1.7
            fill=tuple(int(4+(col[j]-4)*a*0.95) for j in range(3))
            d.ellipse([cx-rr*k,cy-rr*k,cx+rr*k,cy+rr*k],fill=fill)
    base=base.filter(ImageFilter.GaussianBlur(2))
    return base.resize((W,H),Image.BICUBIC).convert("RGBA")

def grain(img,amount=9):
    n=Image.effect_noise((W,H),amount).convert("L")
    n=Image.merge("RGBA",(n,n,n,Image.new("L",(W,H),16)))
    return ImageChops.overlay(img.convert("RGB"),n.convert("RGB")).convert("RGBA")

def vignette(img):
    v=Image.new("L",(W,H),0); ImageDraw.Draw(v).ellipse([-W*0.35,-H*0.5,W*1.35,H*1.5],fill=255)
    v=v.filter(ImageFilter.GaussianBlur(180))
    dark=Image.new("RGBA",(W,H),(2,5,11,255)); dark.putalpha(ImageChops.invert(v).point(lambda p:int(p*0.85)))
    img.alpha_composite(dark); return img

def scrim(img,frac=0.72):
    s=Image.new("RGBA",(W,H),(0,0,0,0)); sd=ImageDraw.Draw(s)
    for i in range(60):
        x=int(W*frac*(i/60.0)+W*0.10)
        sd.rectangle([0,0,x,H],fill=(3,6,12,11))
    img.alpha_composite(s.filter(ImageFilter.GaussianBlur(40))); return img

def hexlattice(img,c1,seed,start=0.655,alpha=1.0):
    """`start` is where the lattice begins as a fraction of the width, `alpha`
    scales it down for the veil layout where it runs under the text as well."""
    r=random.Random(seed); layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer)
    R=54; dx=R*1.5; dy=R*math.sqrt(3)
    lit=set((r.randrange(0,14),r.randrange(-1,7)) for _ in range(18))
    span=max(0.08,1.0-start)
    for i in range(0,int(14/max(span,0.25))+2):
        for j in range(-1,8):
            cx=W*start+i*dx; cy=j*dy+(dy/2 if i%2 else 0)
            if cx-R>W+60: continue
            pts=[(cx+R*math.cos(math.radians(60*k)),cy+R*math.sin(math.radians(60*k))) for k in range(6)]
            fade=max(0.0,min(1.0,(cx-W*start*0.92)/(W*span*0.95)))
            a=int((30+150*fade)*alpha)
            if (i,j) in lit:
                d.polygon(pts,fill=c1+(int((28+60*fade)*alpha),),outline=c1+(min(255,int((a+90)*alpha)),))
            else:
                d.polygon(pts,outline=c1+(a,))
    glowl=layer.filter(ImageFilter.GaussianBlur(9))
    img.alpha_composite(glowl); img.alpha_composite(layer); return img

def monogram(d,x,y,c1):
    """The site's favicon glyph next to the wordmark, so a card in a feed is
    traceable back to the site without reading the URL."""
    sz=36
    mark_x = x
    d.rounded_rectangle([mark_x,y,mark_x+sz,y+sz],radius=9,fill=(9,13,20),outline=c1,width=2)
    f=load_font("fira-code-var.woff2",25,700)
    tw=d.textlength("R",font=f)
    d.text((mark_x+sz/2-tw/2,y+4),"R",font=f,fill=c1)
    fm=load_font("fira-code-var.woff2",23,400)
    mk="rushabhshah.dev"
    d.text((mark_x+sz+14,y+8),mk,font=fm,fill=MUTED)


def text_block(img,post,c1,maxfrac=0.50):
    d=ImageDraw.Draw(img)
    fs=load_font("fira-code-var.woff2",24,500)
    eb=("  ·  ".join("#"+t for t in post["tags"][:2])).upper()
    ebw=d.textlength(eb,font=fs)
    ex = PAD
    d.text((ex,PAD+4),eb,font=fs,fill=c1)
    rx = PAD
    d.line([rx,PAD+40,rx+52,PAD+40],fill=c1,width=3)
    size=88
    maxw=W*maxfrac
    while True:
        g=load_font("space-grotesk-var.woff2",size,700); lines=wrap(d,post["title"],g,maxw)
        step=int(size*1.14)
        if len(lines)*step<=300 or size<=44: break
        size-=4
    y=int(H*0.50-len(lines)*step/2)-6
    for ln in lines:
        lw=d.textlength(ln,font=g)
        lx = PAD
        d.text((lx+2,y+3),ln,font=g,fill=(0,0,0,120))
        d.text((lx,y),ln,font=g,fill=WHITE); y+=step
    monogram(d, PAD, H-PAD-18, c1)
    return img


# One composition, deliberately. Two earlier attempts at variety are gone: a
# mirrored layout, which put one right-aligned card in a single column of
# left-aligned ones and read as a bug, and a two-layout hash that happened to
# split nine-to-one. Variety comes from hue (the post's rarest tag) and from the
# mesh and lit cells being seeded off the slug, which is enough.
def build(post):
    c1,c2=pair(post["tags"])
    img=mesh(post["slug"],c1,c2)
    img=hexlattice(img,c1,post["slug"],start=0.02,alpha=0.55)
    img=vignette(img)
    img=scrim(img,frac=0.82)
    img=text_block(img,post,c1,maxfrac=0.52)
    img=grain(img)
    return img.convert("RGB")

def read_front_matter(path):
    src = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", src, re.S)
    if not m:
        return None
    fm = m.group(1)
    def scalar(key):
        hit = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
        return hit.group(1).strip().strip('"').strip("'") if hit else None
    # Posts use both YAML styles: a block list under `tags:` and the inline
    # `tags: [a, b]` form. Parsing only the first silently produced tagless cards.
    inline = re.search(r"^tags:\s*\[(.*?)\]\s*$", fm, re.M)
    if inline:
        tags = [t.strip().strip('"').strip("'") for t in inline.group(1).split(",") if t.strip()]
    else:
        block = re.search(r"^tags:\s*\n((?:\s+-\s+.+\n?)+)", fm, re.M)
        tags = re.findall(r"^\s+-\s+(.+)$", block.group(1), re.M) if block else []
    return {
        "title": scalar("title"),
        "cover": scalar("cover"),
        "tags": tags,
        "slug": os.path.basename(path)[:-3],
        "path": path,
        "raw": src,
        "fm": fm,
    }

def render(post, out_path):
    img = build(post)
    img.save(out_path, "JPEG", quality=90, optimize=True)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="render every post, not just the ones missing a cover")
    ap.add_argument("--write-frontmatter", action="store_true",
                    help="insert the cover: line into each post it renders")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    made = 0
    for name in sorted(os.listdir(POSTS)):
        if not name.endswith(".md"):
            continue
        post = read_front_matter(os.path.join(POSTS, name))
        if not post or not post["title"]:
            continue
        # A cover outside /assets/blog/og/ was made by hand for that post. Even
        # under --all, generating over it just leaves an unreferenced file behind.
        handmade = post["cover"] and not post["cover"].startswith("/assets/blog/og/")
        if post["cover"] and (handmade or not args.all):
            why = "hand-made" if handmade else "has cover"
            print(f"skip   {post['slug']}  ({why}: {post['cover']})")
            continue

        rel = f"/assets/blog/og/{post['slug']}.jpg"
        path = render(post, os.path.join(OUT, f"{post['slug']}.jpg"))
        size_kb = os.path.getsize(path) // 1024
        print(f"wrote  {rel}  ({size_kb}KB)")
        made += 1

        if args.write_frontmatter and not post["cover"]:
            src = post["raw"]
            # Sit `cover:` immediately above `draft:` to match the other posts.
            if re.search(r"^draft:", post["fm"], re.M):
                new_fm = re.sub(r"^(draft:)", f"cover: {rel}\n\\1", post["fm"], count=1, flags=re.M)
            else:
                new_fm = post["fm"] + f"\ncover: {rel}"
            open(post["path"], "w", encoding="utf-8").write(
                src.replace(post["fm"], new_fm, 1))
            print(f"       + cover: {rel} -> {name}")

    print(f"\n{made} card(s).")


if __name__ == "__main__":
    main()
