/**
 * Renders `backticks` in short frontmatter strings (TIL takeaways) as <code>.
 * Takeaways are plain YAML strings, not markdown, so this is the one bit of
 * markdown they get. Anything else is left as literal text.
 */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={i} className="font-fira text-[0.9em] text-primary">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
