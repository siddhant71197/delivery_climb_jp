/**
 * ══════════════════════════════════════════════════════════════════════════
 *  THE GOAL — a door at the top of the tower, shut or open.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: A GOAL THAT LOOKS LIKE SCENERY. The top of the
 * tower has a shutter over it and a girder under it. If the exit is one more
 * dark rectangle up there, the player spends their first run looking for the way
 * out. So the door is an ARCH — a shape the eye reads as "a place you go" without
 * being told — and it is the one lit thing at the top: shut it is a solid leaf
 * with a brass knob, open it is a bright doorway.
 *
 * ─── THE ANCHOR IS THE THRESHOLD ───────────────────────────────────────────
 *
 * (x, y) is the centre of the threshold, on the floor. The caller places the
 * door on the girder by that point, not by its top-left corner.
 */

import { COLORS } from '../../brand';
import { bake, blit } from '../prerender';
import { roundRect } from '../shapes';

/** The doorway, in stage units. */
const DOOR_W = 54;
const DOOR_H = 58;
/** Margin around the door in the bake, for the threshold step and the keyline. */
const PAD = 6;
/** The threshold line, measured down from the top of the cell. */
const BASE = DOOR_H + 3;

const BOX_W = DOOR_W + PAD * 2;
const BOX_H = BASE + 4;

/**
 * Draw the goal door with its threshold centre at (x, y), in stage units.
 *
 * `px` is device pixels per reference unit, as for every baked sprite.
 */
export function drawGoalArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  px: number,
  open: boolean,
): void {
  const canvas = bake(`goal:${open}`, BOX_W, BOX_H, BOX_W * px, BOX_H * px, (c) =>
    paint(c, open),
  );
  blit(ctx, canvas, x - BOX_W / 2, y - BASE, BOX_W, BOX_H);
}

function paint(ctx: CanvasRenderingContext2D, open: boolean): void {
  const left = PAD;
  const right = PAD + DOOR_W;
  const top = BASE - DOOR_H;
  const bottom = BASE;
  const mid = (left + right) / 2;
  ctx.lineJoin = 'round';

  // The frame. A rounded arch, not a rectangle: a rectangle at this size is
  // indistinguishable from a girder end seen face-on.
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top + 18);
  ctx.quadraticCurveTo(left, top, mid, top);
  ctx.quadraticCurveTo(right, top, right, top + 18);
  ctx.lineTo(right, bottom);
  ctx.closePath();
  ctx.fillStyle = COLORS.goalFrame;
  ctx.fill();
  ctx.strokeStyle = COLORS.goalOutline;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // The opening, inset. Lit when open, the leaf colour when shut.
  const i = 5;
  ctx.beginPath();
  ctx.moveTo(left + i, bottom);
  ctx.lineTo(left + i, top + 18);
  ctx.quadraticCurveTo(left + i, top + i, mid, top + i);
  ctx.quadraticCurveTo(right - i, top + i, right - i, top + 18);
  ctx.lineTo(right - i, bottom);
  ctx.closePath();
  ctx.fillStyle = open ? COLORS.goalOpen : COLORS.goalPanel;
  ctx.fill();

  if (!open) {
    // The leaf: two recessed panels and a knob on the handle side.
    ctx.strokeStyle = COLORS.goalFrame;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    roundRect(ctx, left + 9, top + 12, DOOR_W - 18, 16, 2);
    ctx.stroke();
    ctx.beginPath();
    roundRect(ctx, left + 9, top + 32, DOOR_W - 18, 18, 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(right - 10, bottom - 24, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.goalKnob;
    ctx.fill();
    ctx.strokeStyle = COLORS.goalOutline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // The threshold step. Plants the door on the girder instead of leaving it
  // floating a hair above it.
  ctx.fillStyle = COLORS.goalFrame;
  ctx.fillRect(left - 3, bottom - 2, DOOR_W + 6, 3);
}
