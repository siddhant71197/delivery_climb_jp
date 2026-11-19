/**
 * Greedy line wrap that works for both Latin and Japanese text.
 *
 * Latin words break at spaces, as before. Japanese has no spaces, so every
 * wide (CJK / kana / fullwidth) character is its own break opportunity. A
 * Latin word that is wider than the box on its own is broken per character so
 * it cannot overflow. Line-start prohibited punctuation (。、）… etc.) is never
 * pushed to the start of a new line; it is kept on the line before it.
 */

const WIDE = /[⺀-鿿가-힯豈-﫿＀-￯　-〿]/;

/** Characters that must not begin a line (JIS kinsoku). */
const NO_LINE_START = new Set(
  '、。，．・：；！？ー」』）】〉》〕…‥ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ'.split(''),
);

function isWide(ch: string): boolean {
  return WIDE.test(ch);
}

/** Split into break-opportunity tokens: spaces, single wide chars, Latin words. */
function tokenize(text: string): string[] {
  const out: string[] = [];
  let word = '';
  for (const ch of text) {
    if (ch === ' ') {
      if (word) out.push(word);
      word = '';
      out.push(' ');
    } else if (isWide(ch)) {
      if (word) out.push(word);
      word = '';
      out.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) out.push(word);
  return out;
}

/**
 * Wrap `text` into lines no wider than `maxW`, measured in `fontCss`.
 *
 * `maxLines` caps the result: text past the last allowed line is dropped, which
 * is what a fixed-height tile wants (no overflow past its own edge).
 *
 * Saves and restores the context's font, so callers need not.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  fontCss: string,
  maxLines: number = Infinity,
): string[] {
  ctx.save();
  ctx.font = fontCss;
  const out: string[] = [];
  let line = '';

  const push = (s: string): boolean => {
    out.push(s.replace(/ +$/, ''));
    return out.length >= maxLines;
  };

  // Expand any token that is wider than the box on its own into characters.
  const queue: string[] = [];
  for (const tok of tokenize(text)) {
    if (tok !== ' ' && ctx.measureText(tok).width > maxW) {
      queue.push(...Array.from(tok));
    } else {
      queue.push(tok);
    }
  }

  let done = false;
  for (const tok of queue) {
    if (line === '' && tok === ' ') continue;
    const cand = line + tok;
    if (line === '' || ctx.measureText(cand).width <= maxW) {
      line = cand;
      continue;
    }
    // Overflow: decide where the break goes.
    if (tok === ' ') {
      done = push(line);
      line = '';
    } else if (NO_LINE_START.has(tok)) {
      line = cand;
    } else {
      done = push(line);
      line = tok;
    }
    if (done) break;
  }
  if (!done && line !== '') push(line);
  ctx.restore();
  return out;
}
