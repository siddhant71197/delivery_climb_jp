/**
 * ══════════════════════════════════════════════════════════════════════════
 *  THE COIN — a gold disc with a rim, a face and a turn.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: A COIN THAT READS AS A BUTTON. A flat gold
 * disc with a dot in it is a button, a power-up or a bead. The coin's identity is
 * the RIM: a darker ring inside a keyline, and a raised face with a diamond
 * struck into it. Without the rim the face reads as a plate; without the diamond
 * it reads as a medal.
 *
 * ─── THE KEYLINE IS LOAD-BEARING ───────────────────────────────────────────
 *
 * Gold on the pale stage is legible, but gold on the orange girders is not, and
 * a collectible has to read against both. `coinOutline` is stroked around the
 * rim for that reason.
 *
 * ─── THE TURN IS A SQUASH, NOT A SET OF BAKES ─────────────────────────────
 *
 * A coin spinning on its vertical axis is the same drawing scaled horizontally.
 * The spin is therefore applied at blit time as a width scale, so the face is
 * baked once. The shine sweep is the one thing that is baked per step, because
 * it is a moving highlight over a fixed drawing; see `coinShine`.
 */

import { COLORS } from '../../brand';
import { bake, blit } from '../prerender';

/** Coin radius, in stage units. */
const R = 9;
/** Cell padding for the keyline and the locate halo. */
const PAD = 4;
const BOX = (R + PAD) * 2;
/** Disc centre inside the cell. */
const CX = R + PAD;
const CY = R + PAD;

/** Distinct shine drawings. Quantised for the same reason as every other bake. */
const SHINE_STEPS = 8;
/** Seconds for the highlight to travel once around the rim. */
const SHINE_SEC = 2.4;

/** The narrowest the coin gets on its turn. Never zero: a coin edge-on is a line, and the player must still see it. */
const MIN_SQUASH = 0.08;

/**
 * Which shine drawing to show. Phase-offset per coin index so a row of coins
 * reads as separate objects rather than one coin drawn several times.
 */
export function coinShine(simTime: number, index: number): number {
  const t = simTime / SHINE_SEC + index * 0.31;
  const s = Math.floor((t - Math.floor(t)) * SHINE_STEPS) % SHINE_STEPS;
  return s < 0 ? s + SHINE_STEPS : s;
}

/**
 * Draw a coin with its centre at (x, y), in stage units.
 *
 * `spin` in 0..1 is how far the coin has turned: 0 is face-on, 1 is edge-on
 * (squashed to MIN_SQUASH of its width). It is applied as a horizontal scale, so
 * a spinning coin costs no extra bakes.
 *
 * `shine`, when given, is a `coinShine()` step and selects a baked highlight
 * position. Omit it for a static coin. The bake key carries it, so the two
 * never collide with each other.
 */
export function drawCoinArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  px: number,
  spin = 0,
  shine?: number,
): void {
  const key = shine === undefined ? 'coin' : `coin:shine${shine}`;
  const canvas = bake(key, BOX, BOX, BOX * px, BOX * px, (c) => paint(c, shine));

  const t = spin < 0 ? 0 : spin > 1 ? 1 : spin;
  const squash = Math.max(MIN_SQUASH, 1 - (1 - MIN_SQUASH) * t);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squash, 1);
  blit(ctx, canvas, -CX, -CY, BOX, BOX);
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, shine: number | undefined): void {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  halo(ctx);
  rim(ctx);
  face(ctx, shine);

  ctx.restore();
}

/** The locate halo. Low alpha, under the disc, so an uncollected coin is findable in a busy frame. */
function halo(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.coinGhost;
  ctx.beginPath();
  ctx.arc(0, 0, R + 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The rim: the full disc in the body gold, then a darker ring inside it. The
 * ring is the coin's identity, and it sits on the outer third of the disc so the
 * face keeps most of the area.
 */
function rim(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.coinBody;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, R - 1.6, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.coinRing;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // The keyline sits ON the outer rim, not inside it: drawn inboard it eats the gold.
  ctx.beginPath();
  ctx.arc(0, 0, R - 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.coinOutline;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

/**
 * The face: a paler inner disc, a diamond struck into its centre, and the shine
 * sweep when one is asked for.
 */
function face(ctx: CanvasRenderingContext2D, shine: number | undefined): void {
  const fr = R - 3.4;
  ctx.beginPath();
  ctx.arc(0, 0, fr, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.coinShade;
  ctx.fill();

  // The diamond. A rhombus, not a letter: a coin with a letter reads as a
  // currency, and this game's coin is a prize, not money.
  const d = fr * 0.52;
  ctx.beginPath();
  ctx.moveTo(0, -d);
  ctx.lineTo(d * 0.7, 0);
  ctx.lineTo(0, d);
  ctx.lineTo(-d * 0.7, 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.coinHighlight;
  ctx.fill();

  if (shine !== undefined) {
    // A short bright arc travelling the face — the reason a static gold disc
    // reads as metal rather than as a mustard circle.
    const a0 = (shine / SHINE_STEPS) * Math.PI * 2;
    ctx.strokeStyle = COLORS.coinHighlight;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, fr - 1.2, a0, a0 + 1.1);
    ctx.stroke();
  }
}
