/**
 * ══════════════════════════════════════════════════════════════════════════
 *  LEVELS — the tower, as data, and nothing but data.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: the level that is half in a table and half in
 * an `if (level === 5)`. The moment one archetype needs "just one special case"
 * in the sim, every later level is authored by editing code, every balance pass
 * is a code review, and the headless bot in tools/ is measuring a game whose
 * difficulty lives in nine files. Archetypes differ by DATA — a `kind` string, a
 * belt flag, a spawner row — and src/game/world.ts has exactly one `step()`.
 *
 * ─── THE OBJECTIVE ─────────────────────────────────────────────────────────
 *
 * Every level is won the same way: collect EVERY coin, and the gated rung at the
 * top of the ladder opens. Reach the goal platform on the top floor and the level
 * is cleared. Coins are the only required pickups; powerups (shoyu, helmet, turbo)
 * are optional and never gate anything.
 *
 * ─── WHY `nameIdx` IS A NUMBER ─────────────────────────────────────────────
 *
 * A level row may never hold a display string. Copy is brand-owned and lives in
 * config/copy.ts; a level naming itself would make this file un-reskinnable and
 * would drag the brand module into the sim's import graph, which is what stops
 * the engine running under bare Node. An index costs one lookup at the HUD and
 * keeps game/ free of every string the player ever reads.
 *
 * ─── THE GEOMETRY, AND THE ONE NUMBER IT IS BUILT AROUND ───────────────────
 *
 * Seven floors on a 560×760 stage, `floorGap` 106 apart, girders alternating
 * slope ±1/12 so barrels sweep right on one floor and left on the next with no
 * barrel-specific code anywhere — see the `Girder` header in core/types.ts.
 *
 * Alternating slopes mean the vertical gap between two adjacent floors is NOT
 * 106; it is 106 ∓ the two slopes diverging across the span. That is the one
 * number the layout is built around, because the jump apex is 65.3 and a gap
 * that dips under it turns the ladders into decoration:
 *
 *   girder span 408 → drop 34 → floors staggered 72 apart horizontally
 *   minimum gap = 106 − 34 + 2·(72/12) ÷ … = 78 units, at the open ends.
 *
 * 78 against a 65.3 apex is 12.7 units of headroom — enough that no jump reaches
 * the floor above, tight enough that the tower still reads as climbable. Widen
 * the girders and that margin is the first thing to go.
 */

// ─── Authored shapes ────────────────────────────────────────────────────────

/** A point in stage units. Feet-centre for spawn points; centre for pickups. */
export interface PointDef {
  x: number;
  y: number;
}

/**
 * One floor, as authored. Normalised into a runtime `Girder` by game/stage.ts —
 * which is where `x1 > x0` and the precomputed slope are guaranteed, so nothing
 * here has to be careful about end order.
 *
 * `wallL` / `wallR` default to OPEN. Open is the interesting case and defaults
 * should be the interesting case: a floor is a route with a commitment at one
 * end, and the author who forgets a flag gets a fall, which is visible, rather
 * than an invisible wall, which is not.
 */
export interface GirderDef {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Conveyor push direction. Absent or 0 is a plain girder. */
  belt?: -1 | 0 | 1;
  wallL?: boolean;
  wallR?: boolean;
}

/**
 * A ladder rail. `yTop` is the smaller y — this is screen space, up is less.
 *
 * `gap` is a BROKEN ladder: a stretch of missing rungs that the climb clamps
 * against from whichever side it approaches. `gated` is the COIN gate — exactly
 * one ladder per level carries it, and it is refused until every coin is collected.
 */
export interface LadderDef {
  x: number;
  yTop: number;
  yBottom: number;
  gap?: { top: number; bottom: number };
  gated?: boolean;
}

/** A vertical lift car. Lifts are alternates to the ladders, never the only route. */
export interface LiftDef {
  x: number;
  yTop: number;
  yBottom: number;
  /** Half-width of the car, matching the Body contract. */
  w: number;
  speed: number;
  /** 0..1 offset into the cycle, so a bank of cars is staggered by data. */
  phase: number;
}

/**
 * A barrel source. `x,y` is where the barrel's FEET appear, so it must be on a
 * girder surface — a spawner floating in the air produces a falling barrel,
 * which is legal and occasionally what you want.
 */
export interface SpawnerDef {
  x: number;
  y: number;
  intervalSec: number;
  /** Uniform ± jitter on the interval, so releases never metronome. */
  jitterSec: number;
  /** Probability a release is a wild (bouncing, ladder-ignoring) barrel. */
  wildChance: number;
}

/**
 * A tandoor flame. Authored, never spawned — the count on screen is the count in
 * the table, so a level's pressure is readable from its row.
 *
 * `x,y` is the FEET-CENTRE it starts at and must sit on a girder surface. `dir`
 * is which way it sets off; the patrol reverses at ends and at walls by itself.
 */
export interface FlameDef {
  x: number;
  y: number;
  dir: -1 | 1;
}

/**
 * A falling-tiffin dropper. `x` is the painted lane; `y` is the release height.
 *
 * The cadence carries NO jitter field on purpose. A lane the player must time
 * their crossing of has to be a metronome — see HAZARD.tiffinWarnSec.
 */
export interface TiffinDef {
  x: number;
  y: number;
  intervalSec: number;
  /** Offset into the cycle, so a bank of lanes is staggered by data. */
  phase: number;
}

/**
 * A bouncing scooter source. Also deliberately jitter-free: a hazard you cannot
 * walk under must be learnable, and learnable means the same every time.
 */
export interface ScooterDef {
  x: number;
  y: number;
  dir: -1 | 1;
  speed: number;
  intervalSec: number;
  phase: number;
}

export interface StageDef {
  kind: 'girders' | 'kitchen' | 'lifts';
  /** Index into COPY.levelNames — NEVER a string here. See the header. */
  nameIdx: number;

  girders: GirderDef[];
  ladders: LadderDef[];
  lifts?: LiftDef[];
  spawners: SpawnerDef[];
  /**
   * Every coin in the level. REQUIRED — no `?` — because the coins ARE the gate:
   * a level that forgot them would ship with a ladder that opens on nothing.
   * A level that wanted none would state `[]` on purpose, and checkGate treats
   * that as an open gate.
   */
  coins: PointDef[];
  hazards?: { kind: 'fire' | 'oil' | 'spring'; x: number; y: number }[];

  flames?: FlameDef[];
  /**
   * Probability a flame at a junction picks the branch toward the player.
   *
   * NEVER 1.0, and the ceiling is not a taste call. A perfectly homing chaser
   * removes the only counterplay the player has — reading which way it will go —
   * and converts every flame encounter into a race the flame's speed decides.
   * Around a third is enough that the flames feel aware and low enough that a
   * player who commits to a route is usually right.
   */
  flameChaseChance?: number;
  tiffins?: TiffinDef[];
  scooters?: ScooterDef[];
  /** Where the shoyu shoyus sit. `shoyuCount` says how many of these are live. */
  shoyus?: PointDef[];
  /** Where the helmets sit. `helmetCount` says how many of these are live. */
  helmets?: PointDef[];
  /** Where the turbo boosts sit. `turboCount` says how many of these are live. */
  turbos?: PointDef[];

  /**
   * The three throw positions the monkey shifts between, level 10 only. Absent
   * on every other level, which is what makes `monkeyAt` a fixed landmark for
   * the first nine and a moving problem for the last.
   */
  monkeySlots?: PointDef[];
  monkeyShiftSec?: number;

  agentStart: PointDef;
  monkeyAt: PointDef;
  /** The goal platform. Reached only once every coin is collected. */
  goalAt: PointDef;

  barrelSpeed: number;
  barrelLadderChance: number;
  maxBarrels: number;
  beltPeriodSec?: number;
  timerSec: number;

  shoyuCount: number;
  shoyuSec: number;

  /**
   * The powerup COUNTS are required on every level, the position tables are not.
   *
   * Same split as `shoyuCount`, and required for the same reason: a level's
   * pressure has to be readable off its row without cross-checking an array's
   * length, and an optional count would let "how many helmets does level 8 have"
   * be answered by `undefined` — which reads as zero and is indistinguishable
   * from a deliberate zero. A zero here is a design statement; a missing field is
   * an accident.
   */
  helmetCount: number;
  turboCount: number;
  /** Boost duration. Zero on levels with no turbo — never a leftover from tuning. */
  turboSec: number;

  clearPoints: number;
  timeBonusPerSec: number;
}

// ─── Layout A ───────────────────────────────────────────────────────────────
//
// Floor baselines are 720 − 106·i, and each girder is 408 wide dropping 34 —
// which is exactly 1/12. Even floors run left-to-right and sit at x 40…448;
// odd floors mirror to x 112…520. The 72-unit stagger is what makes a barrel
// leaving one floor's open end land WELL INSIDE the next one rather than on its
// lip, which is the difference between a serpentine and a coin flip.
//
// Every surface y below is an integer on purpose: ladder x values are all ≡ 4
// (mod 12), which lands on an exact rung height on both the even and the odd
// span. Not cosmetic — a ladder foot half a unit under the floor is a mount
// that fails at CLIMB.mountY and is invisible in the data.

function layoutA(): { girders: GirderDef[]; ladders: LadderDef[] } {
  return {
    girders: [
      // F0 — the ground. Walled at BOTH ends, which is the only floor that is.
      // A barrel that has survived the whole tower ends up jammed against the
      // right wall with nowhere downhill to go, and game/barrel.ts retires it
      // there by a general rule, not a floor-0 special case.
      { x0: 40, y0: 703, x1: 448, y1: 737, wallL: true, wallR: true },

      // F1…F5 — walled on the UPHILL end, open on the DOWNHILL end. That single
      // rule is the whole barrel routing: a barrel can only ever leave a floor
      // by the end it was already rolling toward.
      { x0: 112, y0: 631, x1: 520, y1: 597, wallL: false, wallR: true },
      { x0: 40, y0: 491, x1: 448, y1: 525, wallL: true, wallR: false },
      { x0: 112, y0: 419, x1: 520, y1: 385, wallL: false, wallR: true },
      { x0: 40, y0: 279, x1: 448, y1: 313, wallL: true, wallR: false },
      { x0: 112, y0: 207, x1: 520, y1: 173, wallL: false, wallR: true },

      // F6 — the goal platform. Short and walled both ends: it is the one place in
      // the level where the player is asked to stop moving, and a player who walks
      // off the goal floor at the moment of victory quits.
      { x0: 196, y0: 76, x1: 376, y1: 91, wallL: true, wallR: true },
    ],

    ladders: [
      // Zigzag: right, left, right, left, right — so the sweep across each floor
      // is forced, and a coin anywhere on the walking line is on the route by
      // construction rather than by the designer remembering to check.
      { x: 400, yTop: 607, yBottom: 733 }, // F0 → F1
      { x: 148, yTop: 500, yBottom: 628 }, // F1 → F2
      { x: 400, yTop: 395, yBottom: 521 }, // F2 → F3
      { x: 160, yTop: 289, yBottom: 415 }, // F3 → F4
      { x: 388, yTop: 184, yBottom: 308 }, // F4 → F5

      // THE GATE. Exactly one per level, and it is the last rung of the climb —
      // refused until every coin is collected, so the player who skips coins
      // discovers it at the top rather than halfway up.
      { x: 292, yTop: 84, yBottom: 192, gated: true }, // F5 → F6
    ],
  };
}

/** Feet-to-centre offset used to sit a pickup on the walking line. */
const ON_LINE = 18;

// ─── Layouts from one generator ─────────────────────────────────────────────
//
// WHY THESE ARE NOT TYPED BY HAND.
//
// The header's geometry argument — 408-wide girders dropping 34, staggered 72,
// minimum floor gap 78 against a 65.3 apex — is only true if every layout is
// built from the same three lines. Typed by hand it survives exactly until
// someone rounds a y to a whole number to make a ladder "line up", at which
// point one floor is 76 apart, one jump reaches it, and the ladders on that
// floor become decoration. Nobody notices, because the level still looks right.
//
// So the surface is a FUNCTION, and every girder end, every ladder end and every
// coin in layouts B–I is evaluated from it. Layouts differ in what the header
// says they may differ in: where the ladders are, which floors carry belts,
// where a floor is cut in two. Not in the numbers the invariant is made of.
//
// Layout A is left as literals above, deliberately: it is the shipped geometry of
// level 1 and re-deriving it would be a silent re-authoring of the tutorial.

const FLOOR_GAP = 106;
const SPAN = 408;
/** The goal platform is short — see layout A's F6 on why. */
const TOP_SPAN = 180;
const FLOORS = 7;

function floorSpan(i: number): number {
  return i === FLOORS - 1 ? TOP_SPAN : SPAN;
}
function floorX0(i: number): number {
  return i === FLOORS - 1 ? 196 : i % 2 === 0 ? 40 : 112;
}
/** ±1/12, alternating. The serpentine is this sign and nothing else. */
function floorSlope(i: number): number {
  return (i % 2 === 0 ? 1 : -1) / 12;
}

/**
 * The surface height of floor `i` at `x`. THE one geometry expression for
 * layouts B–I; the validator in tools/ evaluates the same numbers off the
 * built girders, so a layout that drifts from this is caught rather than shipped.
 */
export function towerSurfaceY(i: number, x: number): number {
  const cx = floorX0(i) + floorSpan(i) / 2;
  return 720 - FLOOR_GAP * i + floorSlope(i) * (x - cx);
}

/**
 * A coin sitting on floor `i`'s walking line at `x`.
 *
 * Coins sit on the floors the sweep already crosses, between the ladder the
 * player arrives by and the ladder they leave by, so they cost no detour. The
 * tension comes from WHICH SIDE OF THE COIN THE BARREL IS ON, which is free,
 * renewable and different every run. The route-ratio budget in
 * tools/validate-levels.ts fails the build if this discipline slips.
 */
function onLine(i: number, x: number): PointDef {
  return { x, y: towerSurfaceY(i, x) - ON_LINE };
}

/** A body standing on floor `i` at `x` — spawners, flames, the agent, the monkey. */
function onFloor(i: number, x: number): PointDef {
  return { x, y: towerSurfaceY(i, x) };
}

interface TowerOpts {
  /** Six ladder x values, F0→F1 up to the gated F5→F6. */
  ladderXs: readonly number[];
  /** Floor index → conveyor direction. Absent floors are plain. */
  belts?: Readonly<Record<number, -1 | 1>>;
  /** Floors cut in two, with the gap centred at `at` and `gap` units wide. */
  splits?: readonly { floor: number; at: number; gap: number }[];
}

function tower(o: TowerOpts): { girders: GirderDef[]; ladders: LadderDef[] } {
  const girders: GirderDef[] = [];

  for (let i = 0; i < FLOORS; i++) {
    const x0 = floorX0(i);
    const x1 = x0 + floorSpan(i);
    const belt = o.belts?.[i];
    // Walls follow layout A's single rule: the ground and the goal platform are
    // closed at both ends, every other floor is walled on its UPHILL end and open
    // on the downhill one, which is the whole of the barrel routing.
    const wallL = i === 0 || i === FLOORS - 1 || i % 2 === 0;
    const wallR = i === 0 || i === FLOORS - 1 || i % 2 === 1;

    const split = o.splits?.find((s) => s.floor === i);
    if (!split) {
      girders.push({
        x0,
        y0: towerSurfaceY(i, x0),
        x1,
        y1: towerSurfaceY(i, x1),
        belt,
        wallL,
        wallR,
      });
      continue;
    }

    // A CUT FLOOR IS STILL ONE LINE. Both pieces are evaluated from the same
    // surface function, so the jump across the gap is flat-ish and the barrel
    // that misses it falls exactly where the uncut floor would have carried it.
    const lx = split.at - split.gap / 2;
    const rx = split.at + split.gap / 2;
    girders.push({
      x0,
      y0: towerSurfaceY(i, x0),
      x1: lx,
      y1: towerSurfaceY(i, lx),
      belt,
      wallL,
      wallR: false,
    });
    girders.push({
      x0: rx,
      y0: towerSurfaceY(i, rx),
      x1,
      y1: towerSurfaceY(i, x1),
      belt,
      wallL: false,
      wallR,
    });
  }

  const ladders: LadderDef[] = [];
  for (let k = 0; k < FLOORS - 1; k++) {
    const x = o.ladderXs[k]!;
    ladders.push({
      x,
      // Evaluated, never typed. A ladder foot half a unit under the floor is a
      // mount that fails at CLIMB.mountY and is invisible in the data.
      yTop: towerSurfaceY(k + 1, x),
      yBottom: towerSurfaceY(k, x),
      gated: k === FLOORS - 2,
    });
  }

  return { girders, ladders };
}

// ─── Ladder arrangements ────────────────────────────────────────────────────
//
// THE AXIS NOBODY WOULD GUESS FROM A SCREENSHOT: THE GRAIN. A ladder layout
// decides, floor by floor, whether the player sweeps ACROSS the barrels or ALONG
// WITH them, and it is the single biggest difficulty lever in the game.
//
//   AGAINST THE GRAIN: the traverse runs uphill, into the barrel flow. Every
//   encounter is head-on, closing fast, and the answer is the jump.
//
//   WITH THE GRAIN: the traverse runs downhill, the same way the barrels roll.
//   The player overtakes them from behind, and the ladder at the far end is the
//   exact spot barrels pile up before they fall off.
//
// Each arrangement below is a distinct zigzag. Every x is inside the overlap of
// the two floors it joins: [112, 448] for F0…F4, and [196, 376] for the gated F5.

/** B — the kitchen. Belts on the odd floors. AGAINST the grain on every floor. */
const LADDERS_B = [140, 396, 152, 404, 168, 268] as const;
/** C — plain girders, a long sweep on every floor. WITH the grain throughout. */
const LADDERS_C = [372, 176, 356, 132, 420, 316] as const;
/** D — the lift shafts. Ladders stay; the cars are a faster, riskier alternate. */
const LADDERS_D = [152, 416, 144, 424, 168, 300] as const;
/** E — the gauntlet. Two floors cut in half; the gap is the level. */
const LADDERS_E = [404, 200, 396, 180, 412, 260] as const;
/** F — the finale. B's rhythm, D's shaft, E's pressure. */
const LADDERS_F = [388, 160, 380, 172, 400, 292] as const;
/** G — a short first climb, then a deep zigzag. Long traverses every floor. */
const LADDERS_G = [120, 380, 140, 400, 160, 300] as const;
/** H — a tight stair: each ladder sits near the middle of its floor. */
const LADDERS_H = [412, 150, 384, 136, 300, 240] as const;
/** I — the hall of mirrors: near-symmetric, the traverses barely change sign. */
const LADDERS_I = [340, 196, 388, 152, 416, 280] as const;

/**
 * D's two cars.
 *
 * Both are ALTERNATES, never the only way up — every floor still has its ladder.
 * A lift that is the sole route turns a timing hazard into a queue, and a player
 * who mistimes it stands still watching the clock, which is the one thing a
 * level's timer cannot afford.
 */
function liftsD(): LiftDef[] {
  return [
    // Car A skips a WHOLE FLOOR PAIR (F2→F4) rather than a single hop. A shortcut
    // that drops the player ABOVE a coin they still need turns the optimal sweep
    // into a climb back down, and descending through barrels already passed is
    // rework rather than difficulty. tools/validate-levels.ts fails the build on
    // it, which is how this car ended up here instead of on F1→F3.
    { x: 436, yTop: towerSurfaceY(4, 436), yBottom: towerSurfaceY(2, 436), w: 30, speed: 46, phase: 0 },
    { x: 496, yTop: towerSurfaceY(3, 496), yBottom: towerSurfaceY(1, 496), w: 30, speed: 40, phase: 0.5 },
  ];
}

// ─── Levels 1–10 ────────────────────────────────────────────────────────────
//
// THE INVARIANT, AND WHERE IT BREAKS ON PURPOSE.
//
// Levels 1–6 keep barrelSpeed BELOW PHYS.runSpeed (150). That is the beginner's
// whole safety net: every mistake has an escape that needs no timing, because
// walking away always works.
//
// FROM LEVEL 7 THE BARRELS ARE FASTER THAN THE PLAYER. Walking away stops
// working, and the only answers left are the jump, the ladder and the shoyu.
//
// The hard ceiling is 1.35 × runSpeed = 202. tools/validate-levels.ts fails the
// build on it rather than trusting this note.
//
// THE TIMER FALLS FROM 100 SECONDS ON LEVEL 1 TO 70 ON LEVEL 10. Less time is one
// of the pressures, and the last level is the hardest on every axis at once.

/** Level 1 — the tutorial floor set. The route the player is taught on. */
const LEVEL_1: StageDef = (() => {
  const a = layoutA();
  return {
    kind: 'girders',
    nameIdx: 0,
    girders: a.girders,
    ladders: a.ladders,
    spawners: [{ x: 496, y: 175, intervalSec: 3.4, jitterSec: 0.5, wildChance: 0 }],

    // THREE COINS, ALL ON THE WALKING LINE. Not one of them needs a jump, a
    // detour or a second visit to a floor. Level 1's job is to teach that the
    // coins gate the top; it is not the level that tests whether you can collect
    // them under pressure.
    coins: [
      { x: 280, y: 617 - ON_LINE }, // F1, on the walk from ladder 0 to ladder 1
      { x: 232, y: 507 - ON_LINE }, // F2, on the walk from ladder 1 to ladder 2
      { x: 280, y: 299 - ON_LINE }, // F4, on the walk from ladder 3 to ladder 4
    ],

    agentStart: { x: 80, y: 706.3333333333334 },
    monkeyAt: { x: 496, y: 175 },
    goalAt: { x: 340, y: 88 },

    // 96 IS BELOW PHYS.runSpeed (150), AND THAT IS THE WHOLE DESIGN OF LEVEL 1.
    // A beginner who freezes can simply walk away from every barrel on the
    // screen. Nothing here can corner a player who has not yet learned to jump,
    // so the only way to lose is to stand still — which is a lesson, not a wall.
    barrelSpeed: 96,
    // Zero. Barrels stay on the floor they were thrown onto, so the tower's
    // hazard pattern is fully legible from the first floor upward.
    barrelLadderChance: 0,
    maxBarrels: 4,

    timerSec: 100,
    shoyuCount: 0,
    shoyuSec: 0,
    helmetCount: 0,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 1000,
    timeBonusPerSec: 50,
  };
})();

/** Level 2 — a new tower (C): the same job, a longer sweep on every floor. */
const LEVEL_2: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_C });
  return {
    kind: 'girders',
    nameIdx: 1,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.9, jitterSec: 0.5, wildChance: 0 }],
    coins: [onLine(1, 260), onLine(2, 250), onLine(3, 240), onLine(4, 300)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 330),

    // Still under runSpeed. The step from 96 to 104 is deliberately small: what
    // changes on level 2 is the length of every traverse, and raising both by a
    // lot at once would hide which of the two the player is failing to read.
    barrelSpeed: 104,
    // Barrels now leave their floor. One in five — a surprise that happens every
    // time is just a different rule, and one that never happens is decoration.
    barrelLadderChance: 0.2,
    maxBarrels: 5,

    timerSec: 96,
    shoyuCount: 0,
    shoyuSec: 0,
    helmetCount: 0,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 1200,
    timeBonusPerSec: 50,
  };
})();

/** Level 3 — the kitchen (B). Belts on the odd floors, the first one helps you. */
const LEVEL_3: StageDef = (() => {
  // Belts push AGAINST the barrel roll on F1 and F5 and WITH it on F3, so the
  // first belt the player ever meets helps them and the third one does not.
  const t = tower({ ladderXs: LADDERS_B, belts: { 1: 1, 3: -1, 5: 1 } });
  return {
    kind: 'kitchen',
    nameIdx: 2,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.9, jitterSec: 0.5, wildChance: 0 }],
    // The first coin is on F1, which is a BELT floor — the conveyor carries the
    // player into it, so this pickup costs zero seconds. That is R9's free pickup.
    coins: [onLine(1, 300), onLine(2, 250), onLine(3, 280), onLine(4, 300)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 330),

    barrelSpeed: 108,
    barrelLadderChance: 0.32,
    maxBarrels: 6,
    beltPeriodSec: 0,
    timerSec: 93,

    shoyuCount: 0,
    shoyuSec: 0,
    helmetCount: 0,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 1400,
    timeBonusPerSec: 50,
  };
})();

/** Level 4 — a new tower (H), two flames and the first shoyu. */
const LEVEL_4: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_H });
  return {
    kind: 'girders',
    nameIdx: 3,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 3.2, jitterSec: 0.5, wildChance: 0 }],
    coins: [onLine(0, 200), onLine(1, 300), onLine(2, 260), onLine(3, 220)],

    flames: [
      { ...onFloor(2, 400), dir: -1 },
      { ...onFloor(4, 120), dir: 1 },
    ],
    flameChaseChance: 0.34,
    shoyus: [onLine(2, 300)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 316),

    barrelSpeed: 116,
    barrelLadderChance: 0.38,
    maxBarrels: 7,
    timerSec: 90,

    shoyuCount: 1,
    shoyuSec: 6,
    helmetCount: 0,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 1600,
    timeBonusPerSec: 50,
  };
})();

/** Level 5 — the lift shafts (D). A coin rides in car A's column: the free one. */
const LEVEL_5: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_D });
  return {
    kind: 'lifts',
    nameIdx: 4,
    girders: t.girders,
    ladders: t.ladders,
    lifts: liftsD(),
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.7, jitterSec: 0.5, wildChance: 0 }],

    // The F4 coin sits in car A's column at the top of its travel, so a player
    // who rides up collects it without stopping. It is the level's free pickup.
    coins: [onLine(1, 280), onLine(2, 290), onLine(4, 436), onLine(5, 250)],

    helmets: [onLine(2, 250)],
    tiffins: [
      { x: 250, y: 60, intervalSec: 3.6, phase: 0 },
      { x: 340, y: 60, intervalSec: 3.6, phase: 0.5 },
    ],
    shoyus: [onLine(3, 360)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 300),

    barrelSpeed: 120,
    barrelLadderChance: 0.4,
    maxBarrels: 6,
    timerSec: 86,

    shoyuCount: 1,
    shoyuSec: 4,
    helmetCount: 1,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 1800,
    timeBonusPerSec: 50,
  };
})();

/** Level 6 — a new tower (I) with a cut floor. The gap is the level. */
const LEVEL_6: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_I, splits: [{ floor: 3, at: 300, gap: 48 }] });
  return {
    kind: 'girders',
    nameIdx: 5,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.6, jitterSec: 0.5, wildChance: 0 }],
    coins: [onLine(0, 200), onLine(1, 270), onLine(2, 300), onLine(3, 352), onLine(4, 300)],

    flames: [{ ...onFloor(2, 400), dir: -1 }],
    flameChaseChance: 0.34,
    shoyus: [onLine(3, 420)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 280),

    barrelSpeed: 126,
    barrelLadderChance: 0.44,
    maxBarrels: 8,
    timerSec: 83,

    shoyuCount: 1,
    shoyuSec: 8,
    helmetCount: 0,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 2000,
    timeBonusPerSec: 50,
  };
})();

/**
 * Level 7 — the barrels outrun the player from here on. A new deep zigzag (G),
 * scooters, and the first turbo.
 */
const LEVEL_7: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_G });
  return {
    kind: 'girders',
    nameIdx: 6,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.5, jitterSec: 0.45, wildChance: 0.12 }],
    coins: [onLine(1, 250), onLine(2, 280), onLine(3, 300), onLine(4, 240), onLine(5, 220)],

    scooters: [
      { ...onFloor(1, 500), dir: -1, speed: 132, intervalSec: 5.5, phase: 0 },
      { ...onFloor(3, 500), dir: -1, speed: 132, intervalSec: 5.5, phase: 0.5 },
    ],
    shoyus: [onLine(2, 320)],
    turbos: [onLine(1, 320)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 316),

    barrelSpeed: 158,
    barrelLadderChance: 0.46,
    maxBarrels: 9,
    timerSec: 80,

    shoyuCount: 1,
    shoyuSec: 6,
    helmetCount: 0,
    turboCount: 1,
    turboSec: 5,

    clearPoints: 2400,
    timeBonusPerSec: 50,
  };
})();

/** Level 8 — the lift shafts again (D), on a new ladder set (F), with belts. */
const LEVEL_8: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_F, belts: { 2: -1, 4: 1 } });
  return {
    kind: 'lifts',
    nameIdx: 7,
    girders: t.girders,
    ladders: t.ladders,
    lifts: liftsD(),
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.4, jitterSec: 0.45, wildChance: 0.14 }],
    coins: [onLine(1, 280), onLine(2, 200), onLine(3, 300), onLine(4, 436), onLine(5, 250)],

    helmets: [onLine(3, 240)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 300),

    barrelSpeed: 168,
    barrelLadderChance: 0.48,
    maxBarrels: 9,
    beltPeriodSec: 0,
    timerSec: 76,

    shoyuCount: 0,
    shoyuSec: 0,
    helmetCount: 1,
    turboCount: 0,
    turboSec: 0,

    clearPoints: 2800,
    timeBonusPerSec: 50,
  };
})();

/** Level 9 — the gauntlet (E): two floors cut in half, and the highest density. */
const LEVEL_9: StageDef = (() => {
  const t = tower({
    ladderXs: LADDERS_E,
    splits: [
      { floor: 2, at: 244, gap: 48 },
      { floor: 4, at: 244, gap: 48 },
    ],
  });
  return {
    kind: 'girders',
    nameIdx: 8,
    girders: t.girders,
    ladders: t.ladders,
    spawners: [
      { x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.2, jitterSec: 0.4, wildChance: 0.16 },
      { x: 448, y: towerSurfaceY(3, 448), intervalSec: 6, jitterSec: 0.5, wildChance: 0 },
    ],
    coins: [onLine(1, 300), onLine(2, 300), onLine(3, 280), onLine(4, 340), onLine(5, 340)],

    flames: [{ ...onFloor(4, 340), dir: -1 }],
    flameChaseChance: 0.4,
    scooters: [{ ...onFloor(3, 500), dir: -1, speed: 138, intervalSec: 5, phase: 0.25 }],
    shoyus: [onLine(1, 240)],
    helmets: [onLine(2, 340)],
    turbos: [onLine(4, 300)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    goalAt: onFloor(6, 280),

    barrelSpeed: 180,
    barrelLadderChance: 0.52,
    maxBarrels: 11,
    timerSec: 73,

    shoyuCount: 1,
    shoyuSec: 6,
    helmetCount: 1,
    turboCount: 1,
    turboSec: 5,

    clearPoints: 3200,
    timeBonusPerSec: 50,
  };
})();

/**
 * Level 10 — the finale (F). The moving thrower, a lift, belts both ways, and
 * seven coins. The hardest parameters and the shortest timer.
 */
const LEVEL_10: StageDef = (() => {
  const t = tower({ ladderXs: LADDERS_F, belts: { 1: 1, 4: -1 } });
  return {
    kind: 'lifts',
    nameIdx: 9,
    girders: t.girders,
    ladders: t.ladders,
    lifts: [{ x: 468, yTop: towerSurfaceY(3, 468), yBottom: towerSurfaceY(1, 468), w: 30, speed: 50, phase: 0 }],
    spawners: [{ x: 496, y: towerSurfaceY(5, 496), intervalSec: 2.2, jitterSec: 0.4, wildChance: 0.18 }],
    coins: [
      onLine(0, 320),
      onLine(1, 280),
      onLine(2, 200),
      onLine(2, 270),
      onLine(3, 280),
      onLine(4, 280),
      onLine(5, 340),
    ],

    flames: [
      { ...onFloor(2, 400), dir: -1 },
      { ...onFloor(4, 120), dir: 1 },
    ],
    flameChaseChance: 0.42,
    tiffins: [
      { x: 220, y: 60, intervalSec: 4, phase: 0 },
      { x: 420, y: 60, intervalSec: 4, phase: 0.5 },
    ],
    scooters: [{ ...onFloor(3, 500), dir: -1, speed: 140, intervalSec: 5.5, phase: 0 }],
    shoyus: [onLine(1, 220), onLine(4, 340)],
    helmets: [onLine(2, 320)],
    turbos: [onLine(3, 330)],

    agentStart: onFloor(0, 80),
    monkeyAt: onFloor(5, 496),
    monkeySlots: [onFloor(5, 496), onFloor(5, 460), onFloor(5, 424)],
    monkeyShiftSec: 6,
    goalAt: onFloor(6, 330),

    barrelSpeed: 195,
    barrelLadderChance: 0.55,
    maxBarrels: 12,
    beltPeriodSec: 10,
    timerSec: 70,

    shoyuCount: 2,
    shoyuSec: 7,
    helmetCount: 1,
    turboCount: 1,
    turboSec: 6,

    clearPoints: 4000,
    timeBonusPerSec: 60,
  };
})();

/**
 * All ten. game/level.ts CLAMPS the lookup, so a build that ships fewer rows is
 * a build with fewer levels rather than a black screen.
 */
export const LEVELS: readonly StageDef[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  LEVEL_4,
  LEVEL_5,
  LEVEL_6,
  LEVEL_7,
  LEVEL_8,
  LEVEL_9,
  LEVEL_10,
];
