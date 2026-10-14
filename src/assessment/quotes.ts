// Rule 2: no unverified AI output reaches the UI. A quote counts only if its words appear in its
// source after whitespace and punctuation are normalised.

/** Lowercase words only: markdown escapes, punctuation, curly quotes and dashes removed, spaces collapsed. */
export const quoteForm = (text: string) =>
  text
    .replace(/\\(["\\])/g, "$1")
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟"]/g, " ")
    .replace(/[-–—―….,;:!?()[\]{}*_`|#>]/g, " ")
    .replace(/(^|\s)'|'(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** True when the quote is non-empty and appears in the text, word for word. */
export function quoteFound(text: string, quote: string) {
  const needle = quoteForm(quote);
  return needle.length > 0 && ` ${quoteForm(text)} `.includes(` ${needle} `);
}
