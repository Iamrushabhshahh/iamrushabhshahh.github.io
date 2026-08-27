# Post diagrams

Editable sources for the hand-drawn diagrams used by posts in `content/posts/`. The rendered
SVGs live in `/assets/blog/` and are what the posts actually reference.

## Editing one by hand

Open [excalidraw.com](https://excalidraw.com), then drag any `.excalidraw` file
onto the canvas. Edit, then use **File > Export image > SVG** and overwrite the
matching file in `assets/blog/`.

## Regenerating them from code

`diagrams.mjs` holds the scene definitions, `render.mjs` turns a scene into a
rough.js SVG, and `to-excalidraw.mjs` writes the `.excalidraw` file for the same
scene. Both outputs come from one definition, so they never drift apart.

These need two packages the site itself doesn't use, so install them somewhere
scratch rather than adding them to the site's `package.json`:

```
npm i roughjs svgo
node diagrams.mjs                              # writes svg/ and excalidraw/
npx svgo -f svg -o svg --multipass --precision=1
cp svg/*.svg          ../assets/blog/
cp excalidraw/*.excalidraw .   # back into this folder
```

## Why the diagrams have their own light background

The site has a dark and a light theme, driven by `data-theme` on `<html>`. An
SVG loaded through `<img>` can't see that attribute, so a theme-reactive diagram
would go wrong for anyone whose chosen theme differs from their OS setting. Each
diagram therefore paints its own soft off-white card and stays readable in both.
Only the frame around it follows the theme, via `.post-prose figure` in
`style.css`.
