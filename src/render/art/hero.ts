/**
 * ══════════════════════════════════════════════════════════════════════════
 *  THE HERO — a red-capped plumber, drawn at 30×44.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: A HERO THAT DISSOLVES INTO THE TOWER.
 *
 * The girders are the brand colour, and so is the cap's badge bed and the
 * shirt's shade. Drawn as flat fills with no keyline, the avatar would sink into
 * the floor it stands on at exactly the size this game draws him. So every shape
 * below is stroked in `heroOutline`, and the colour split is what carries the
 * read: a RED top over BLUE overalls, WHITE gloves at the ends of the arms, and a
 * BROWN boot at the foot. Those four bands are the silhouette at small sizes.
 *
 * ─── THE RECOGNITION CUE HIERARCHY ─────────────────────────────────────────
 *
 * 1. The red cap with its round badge. The head is the first thing the eye
 *    reads, so the cap is the largest uninterrupted red shape above the waist.
 * 2. The moustache, a dark mark under the nose. It is the single detail that
 *    turns a red hat into a face, and it is why the face is drawn at all.
 * 3. The blue overalls with two brass buttons, which mark the body as a
 *    workman rather than a runner in a vest.
 *
 * Nothing carries an object in the hand. The hero is the figure, and the only
 * thing that changes between poses is the limbs.
 *
 * ─── EVERY POSE IS BAKED ───────────────────────────────────────────────────
 *
 * Nine poses, one facing. The figure is a few dozen paths, and there is exactly
 * one hero on screen, so a bake is never evicted for being numerous. The mirror
 * is a transform at blit time, which halves the cache for free.
 */

import { COLORS } from '../../brand';
import { bake, blit } from '../prerender';
import { roundRect } from '../shapes';

// ─── The art box ────────────────────────────────────────────────────────────
//
// Taller than the sim's hitbox (AGENT.drawH, 44) because the cap sits above the
// head and the boots sit below the feet line. The sim's box is the hitbox's
// parent, not the picture's — conflating them is how a character ends up cropped
// at the ankles on the one pose that reaches furthest.

/** Reference units across the baked cell. */
const BOX_W = 48;
/** Reference units down the baked cell. */
const BOX_H = 54;
/** Where the sim's feet-centre lands inside the cell. */
const FOOT_X = 24;
const FOOT_Y = 47;

/** Body centre line. */
const CX = 24;

export type AgentPose =
  | 'idle'
  | 'run0'
  | 'run1'
  | 'run2'
  | 'climb0'
  | 'climb1'
  | 'jump'
  | 'hit'
  | 'win';

/** The run cycle, in the order the phase counter walks them. */
const RUN_CYCLE: readonly AgentPose[] = ['run0', 'run1', 'run2', 'run1'];

/** Reference units of travel per run frame. Tuned so a full stride is ~4 steps. */
const STRIDE = 11;

/**
 * Pick the pose from what the SIM already knows.
 *
 * No animation state is stored anywhere: the run phase is a function of the
 * body's x, which means it is deterministic, survives a pause, never desyncs
 * from the interpolated position, and costs nothing to reset. A frame counter
 * would drift against the lerp and would have to be cleared on respawn.
 */
export function agentPose(
  state: 'run' | 'air' | 'climb' | 'hit' | 'win',
  x: number,
  y: number,
  moving: boolean,
): AgentPose {
  switch (state) {
    case 'air':
      return 'jump';
    case 'hit':
      return 'hit';
    case 'win':
      return 'win';
    case 'climb':
      // Keyed on y, not x — a climber's hands alternate with HEIGHT gained.
      return Math.floor(Math.abs(y) / 9) % 2 === 0 ? 'climb0' : 'climb1';
    default:
      if (!moving) return 'idle';
      return RUN_CYCLE[Math.floor(Math.abs(x) / STRIDE) % RUN_CYCLE.length]!;
  }
}

// ─── Blit ───────────────────────────────────────────────────────────────────

/**
 * Draw the hero with his feet-centre at (x, y), in stage units.
 *
 * `px` is device pixels per reference unit — the bake has to be sized in device
 * pixels or it is magnified by the root transform and reads soft on every phone
 * with a dpr above 1, which is all of them.
 *
 * The climb pose ignores `face`: a body on a ladder is seen from behind, and
 * mirroring a back view would flip the cap badge and the buttons sides while he
 * climbs.
 */
export function drawAgentArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  px: number,
  pose: AgentPose,
  face: number,
): void {
  const canvas = bake(
    `hero:${pose}`,
    BOX_W,
    BOX_H,
    BOX_W * px,
    BOX_H * px,
    (c) => paint(c, pose),
  );

  const mirror = face < 0 && pose !== 'climb0' && pose !== 'climb1';
  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  blit(ctx, canvas, -FOOT_X, -FOOT_Y, BOX_W, BOX_H);
  ctx.restore();
}

// ─── The figure ─────────────────────────────────────────────────────────────

/** The keyline width. One value, so nothing in the figure reads heavier than the rest. */
const LINE = 1.6;

function strokeIt(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = COLORS.heroOutline;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Fill then keyline, in that order, on the path already built. */
function inked(ctx: CanvasRenderingContext2D, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fill();
  strokeIt(ctx);
}

/**
 * A limb: a capsule from (x0,y0) to (x1,y1).
 *
 * Capsules rather than rectangles because every joint in this figure is drawn
 * as an overlap, and two overlapping rounded ends read as a knee. Two
 * overlapping rectangle corners read as a break.
 */
function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  fill: string,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  ctx.beginPath();
  roundRect(ctx, -w / 2, -w / 2, len + w, w, w / 2);
  inked(ctx, fill);
  ctx.restore();
}

/** A white glove at a hand. Round, so it reads as a fist rather than a paddle. */
function glove(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 2.9, 0, Math.PI * 2);
  inked(ctx, COLORS.heroGlove);
}

/** One leg in blue overalls, plus its brown boot. */
function leg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
): void {
  limb(ctx, hipX, hipY, kneeX, kneeY, 6.4, COLORS.heroOveralls);
  limb(ctx, kneeX, kneeY, footX, footY, 5.6, COLORS.heroOverallsShade);

  // The boot. Brown, not black: the brand's ink would merge with the keyline
  // and the legs would lose their separation from the floor.
  ctx.beginPath();
  roundRect(ctx, footX - 3.6, footY - 1.6, 8.4, 3.8, 1.8);
  inked(ctx, COLORS.heroBoot);
}

/**
 * The shirt and the overalls bib. The shirt is the red block; the bottom of it
 * is the blue bib, cut by a keyline seam, with two brass buttons on the bib.
 */
function torso(ctx: CanvasRenderingContext2D, tx: number, ty: number, w: number, h: number): void {
  ctx.beginPath();
  roundRect(ctx, tx, ty, w, h, 4);
  inked(ctx, COLORS.heroShirt);

  const seam = ty + h * 0.55;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, tx, ty, w, h, 4);
  ctx.clip();
  ctx.fillStyle = COLORS.heroOveralls;
  ctx.fillRect(tx - 1, seam, w + 2, h);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(tx, seam);
  ctx.lineTo(tx + w, seam);
  ctx.strokeStyle = COLORS.heroOutline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Two brass buttons, the one detail that makes the bib read as overalls.
  const by = seam + (ty + h - seam) * 0.45;
  for (const bx of [tx + w * 0.3, tx + w * 0.72]) {
    ctx.beginPath();
    ctx.arc(bx, by, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.heroButton;
    ctx.fill();
    ctx.strokeStyle = COLORS.heroOutline;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

/**
 * Head, cap, badge, moustache. Side view, facing +x.
 *
 * The cap is the first read: a red dome with a forward brim and a round white
 * badge on the front of the dome. The face is a small skin wedge under the brim,
 * with the moustache under the nose.
 */
function head(ctx: CanvasRenderingContext2D, hx: number, hy: number, tilt: number): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);

  // Face.
  ctx.beginPath();
  roundRect(ctx, -4.4, -3.4, 9, 9.2, 3.4);
  inked(ctx, COLORS.heroSkin);

  // Hair at the back, under the cap.
  ctx.beginPath();
  roundRect(ctx, -4.8, -0.6, 2, 4.2, 1);
  ctx.fillStyle = COLORS.heroMoustache;
  ctx.fill();

  // The nose: a small skin bump past the face line, so the profile reads.
  ctx.beginPath();
  ctx.arc(4.8, 2.2, 1.5, 0, Math.PI * 2);
  inked(ctx, COLORS.heroSkin);

  // The cap: a dome with a flat forward brim.
  ctx.beginPath();
  ctx.arc(0, -1.2, 6.6, Math.PI, Math.PI * 2);
  ctx.lineTo(8.6, -0.2);
  ctx.lineTo(8.6, 1);
  ctx.lineTo(-6.6, 1);
  ctx.closePath();
  inked(ctx, COLORS.heroCap);

  // One shade step along the underside of the brim, clipped to the cap.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -1.2, 6.6, Math.PI, Math.PI * 2);
  ctx.lineTo(8.6, -0.2);
  ctx.lineTo(8.6, 1);
  ctx.lineTo(-6.6, 1);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = COLORS.heroCapShade;
  ctx.fillRect(-7, 0, 17, 1.6);
  ctx.restore();

  // The badge: round, white, on the front of the dome.
  ctx.beginPath();
  ctx.arc(2.4, -4, 1.7, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.heroBadge;
  ctx.fill();
  ctx.strokeStyle = COLORS.heroOutline;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Eye, under the brim.
  ctx.beginPath();
  ctx.arc(2.6, 2, 0.9, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.heroOutline;
  ctx.fill();

  // Moustache, under the nose.
  ctx.beginPath();
  roundRect(ctx, 0.4, 3.6, 5.2, 1.7, 0.85);
  ctx.fillStyle = COLORS.heroMoustache;
  ctx.fill();

  ctx.restore();
}

/** The back of the head, for the climb. No face, no badge: the rear of the cap. */
function headBack(ctx: CanvasRenderingContext2D): void {
  // Nape of the neck, under the cap.
  ctx.beginPath();
  roundRect(ctx, CX - 4, 9.5, 8, 5, 2);
  inked(ctx, COLORS.heroSkin);

  // Dark hair showing under the rear of the cap.
  ctx.beginPath();
  roundRect(ctx, CX - 4.2, 9.2, 8.4, 2, 1);
  ctx.fillStyle = COLORS.heroMoustache;
  ctx.fill();

  // The cap, seen from behind: a dome with the brim edge along its base.
  ctx.beginPath();
  ctx.arc(CX, 9, 6.6, Math.PI, Math.PI * 2);
  ctx.lineTo(CX + 6.6, 11.2);
  ctx.lineTo(CX - 6.6, 11.2);
  ctx.closePath();
  inked(ctx, COLORS.heroCap);

  ctx.fillStyle = COLORS.heroCapShade;
  ctx.fillRect(CX - 6, 10.2, 12, 1.2);
}

// ─── The poses ──────────────────────────────────────────────────────────────
//
// Each pose is a complete drawing rather than a rig with parameters. A rig
// would be less code and would make every pose a compromise between the others;
// the win pose has both arms straight up, and the hit pose throws the whole
// figure back, and neither survives being averaged with a run.

function paint(ctx: CanvasRenderingContext2D, pose: AgentPose): void {
  ctx.lineCap = 'round';
  switch (pose) {
    case 'climb0':
      climbPose(ctx, 1);
      break;
    case 'climb1':
      climbPose(ctx, -1);
      break;
    case 'jump':
      jumpPose(ctx);
      break;
    case 'hit':
      hitPose(ctx);
      break;
    case 'win':
      winPose(ctx);
      break;
    case 'run0':
      runPose(ctx, 0);
      break;
    case 'run1':
      runPose(ctx, 1);
      break;
    case 'run2':
      runPose(ctx, 2);
      break;
    default:
      runPose(ctx, -1);
      break;
  }
}

/**
 * The side view. `swing` is −1 for the idle (feet together) and 0..2 for the
 * three run frames: contact, pass, contact-opposite.
 */
function runPose(ctx: CanvasRenderingContext2D, swing: number): void {
  // Vertical bob. The pass frame is the one where a runner is highest, which is
  // what turns three still drawings into a gait rather than a shuffle.
  const bob = swing === 1 ? -1.6 : 0;
  // The idle is NOT feet-together. Two legs on the same line resolve into a
  // single dark column at 30 units and the figure loses its stance.
  const spread = swing < 0 ? 3 : swing === 1 ? 1.5 : 6;
  const lead = swing === 2 ? -1 : 1;

  const hipY = 32 + bob;
  const shoeY = 45;

  // BACK leg first, so the front leg overlaps it and the figure has depth.
  leg(ctx, CX - 2.2, hipY, CX - 2.2 - spread * lead * 0.5, hipY + 6, CX - spread * lead, shoeY);

  // The back arm, swinging opposite the front one and drawn behind the shirt.
  const bX = CX - 9 - spread * 0.3 * lead;
  const bY = 27 + bob;
  limb(ctx, CX - 4, 20 + bob, bX, bY, 5.2, COLORS.heroShirtShade);
  glove(ctx, bX, bY);

  torso(ctx, CX - 7.5, 16 + bob, 15, 17);
  head(ctx, CX + 1.5, 10 + bob, 0);

  // The forward arm.
  const hX = CX + 9 + spread * 0.4 * -lead;
  const hY = 28 + bob;
  limb(ctx, CX + 5, 20 + bob, hX, hY, 5.2, COLORS.heroShirt);
  glove(ctx, hX, hY);

  // FRONT leg last.
  leg(ctx, CX + 2.2, hipY, CX + 2.2 + spread * lead * 0.5, hipY + 6, CX + spread * lead, shoeY);
}

/**
 * The back view, on a ladder. `hand` alternates which arm is high.
 *
 * Seen from behind the blue overalls fill the lower half of the figure and the
 * cap is the top of it — the two colours that matter most in the whole sprite.
 */
function climbPose(ctx: CanvasRenderingContext2D, hand: number): void {
  const legLift = 3 * hand;

  leg(ctx, CX - 4, 33, CX - 5, 39 - Math.max(0, legLift), CX - 5, 45 - Math.max(0, legLift));
  leg(ctx, CX + 4, 33, CX + 5, 39 - Math.max(0, -legLift), CX + 5, 45 - Math.max(0, -legLift));

  torso(ctx, CX - 9, 15, 18, 19);

  // Arms reaching up the rails, one higher than the other.
  const lY = 14 - 4 * hand;
  const rY = 14 + 4 * hand;
  limb(ctx, CX - 7, 20, CX - 11, lY, 5.2, COLORS.heroShirt);
  glove(ctx, CX - 11, lY);
  limb(ctx, CX + 7, 20, CX + 11, rY, 5.2, COLORS.heroShirt);
  glove(ctx, CX + 11, rY);

  headBack(ctx);
}

/** Airborne: knees tucked, the forward arm out and up. Reads as "committed", not "falling". */
function jumpPose(ctx: CanvasRenderingContext2D): void {
  leg(ctx, CX - 2.5, 30, CX - 8, 33, CX - 9.5, 39);
  torso(ctx, CX - 7.5, 14, 15, 17);
  head(ctx, CX + 2, 8, 0.12);
  limb(ctx, CX + 5, 18, CX + 12, 12, 5.2, COLORS.heroShirt);
  glove(ctx, CX + 12, 12);
  leg(ctx, CX + 2.5, 30, CX + 7, 32, CX + 8, 38);
}

/**
 * Hit. The whole figure is rotated, not just the head.
 *
 * A death pose that only changes the face is invisible at this size; a rotated
 * silhouette is legible in peripheral vision, which is where the player's
 * attention actually is at the moment they get hit.
 */
function hitPose(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(CX, 40);
  ctx.rotate(-0.34);
  ctx.translate(-CX, -40);

  leg(ctx, CX - 2.5, 32, CX - 7, 37, CX - 11, 42);
  torso(ctx, CX - 7.5, 17, 15, 17);
  head(ctx, CX + 2, 11, -0.2);
  // Both arms thrown up.
  limb(ctx, CX + 5, 20, CX + 11, 11, 5.2, COLORS.heroShirt);
  glove(ctx, CX + 11, 11);
  limb(ctx, CX - 5, 20, CX - 10, 12, 5.2, COLORS.heroShirtShade);
  glove(ctx, CX - 10, 12);
  leg(ctx, CX + 2.5, 32, CX + 8, 35, CX + 12, 39);

  ctx.restore();
}

/**
 * The win: both arms straight up, gloves high, feet apart. The one pose in the
 * game that is open rather than closed, which is the point of it.
 */
function winPose(ctx: CanvasRenderingContext2D): void {
  leg(ctx, CX - 3, 32, CX - 6, 38, CX - 8, 45);
  limb(ctx, CX - 4, 20, CX - 10, 6, 5.2, COLORS.heroShirtShade);
  glove(ctx, CX - 10, 6);
  torso(ctx, CX - 7.5, 16, 15, 17);
  head(ctx, CX + 1.5, 10, 0);
  limb(ctx, CX + 5, 20, CX + 11, 6, 5.2, COLORS.heroShirt);
  glove(ctx, CX + 11, 6);
  leg(ctx, CX + 3, 32, CX + 6, 38, CX + 8, 45);
}
