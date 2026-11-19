/**
 * ══════════════════════════════════════════════════════════════════════════
 *  STAGE CLEAR — the coin and score tally, and the last screen of the run.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS (1): the results screen that shows a total. A
 * single big number tells the player what they scored and nothing about WHY, so
 * the bonuses the game spent ten levels teaching — every coin, the time left on
 * the clock, the lives kept — are invisible at the one moment they would be
 * read. The rows are the feedback loop; the score is just where it lands.
 *
 * THE FAILURE THIS FILE PREVENTS (2): the run that just stops. Level 10 is the
 * end of the game and it must not hand back a NEXT button pointing at a level
 * that does not exist. `final` on the payload switches this scene to the
 * completion state, which is the same screen's job (you cleared it; here is what
 * it came to) rather than a sixth scene with its own layout.
 *
 * ─── THE VERDICT IS HANDED IN, NEVER RE-DERIVED ────────────────────────────
 *
 * `perfect` and `rescued` are decided by the sim. The ONE thing computed here is
 * the coin sweep, and only because it is not a judgement: it is `coins ===
 * coinTotal`, the numbers already printed on the tally, said once more with a name.
 *
 * Like every scene here it NAVIGATES NOTHING: `onNext` and `onHome`, and main.ts
 * decides what the next level is.
 */

import type { PointerKind } from '../core/types';
import { COLORS, IDENTITY, withAlpha } from '../brand';
import { COPY } from '../config/copy';
import { RADIUS, SPACE, TEXT, TRACK, WEIGHT } from '../config/theme';
import { columnRect, menuContentRect, rect, type Rect } from '../render/layout';
import {
  BUTTON_H,
  BUTTON_H_SM,
  button,
  card,
  ctaRect,
  dashedDivider,
  hitTest,
  iconStar,
  label,
  valueRow,
} from '../render/ui';
import { drawMarkCentered, markHeight } from '../render/mark';
import { clamp } from '../core/math';
import { drawAgentArt } from '../render/art/hero';
import { drawGoalArt } from '../render/art/goal';
import { drawCoinArt } from '../render/art/coin';
import type { Viewport } from '../render/canvas';
import { track } from '../ui/analytics';
import type { GameScene, SceneId } from './director';

export interface StageClearPayload {
  level: number;
  score: number;
  /** Coins collected on this stage, and how many the stage holds. */
  coins: number;
  coinTotal: number;
  /** Tries left when the stage was cleared. */
  lives: number;
  /** Whole seconds left on the clock: the time bonus. */
  timeLeft: number;
  perfect: boolean;
  /** True when the level was reached through the rescue/skip path. */
  rescued: boolean;

  /**
   * THE RUN IS OVER. Set by main.ts when the stage just cleared was the last
   * one. Absent is false, so the ordinary tally shows with a next-stage button.
   */
  final?: boolean;

  /** WHOLE-RUN FIGURES, for the completion state only. Missing fields fall back
   *  to what this stage alone can prove. */
  totals?: {
    /** Stages cleared this run. */
    levels: number;
    /** Coins taken across the run. */
    coins: number;
    /** Longest streak of stages cleared without losing a try. */
    streak: number;
    /** How many of them were perfect. */
    perfect: number;
    /** The run's score. Distinct from this stage's `score`. */
    score: number;
  };
}

export interface StageClearCallbacks {
  onNext(level: number): void;
  onHome(): void;
}

const R_NEXT = 0;
const R_HOME = 1;

export class StageClearScene implements GameScene {
  readonly id: SceneId = 'stageClear';

  private data: StageClearPayload = {
    level: 1,
    score: 0,
    coins: 0,
    coinTotal: 0,
    lives: 0,
    timeLeft: 0,
    perfect: false,
    rescued: false,
  };

  private readonly regions: Rect[] = [
    { x: 0, y: 0, w: 0, h: 0 },
    { x: 0, y: 0, w: 0, h: 0 },
  ];
  private pressed = -1;
  /** Set after a clipboard fallback, so the share button can confirm it did
   *  something. Completion state only. */
  private shared = false;
  private px = 1;

  constructor(
    private readonly vp: Viewport,
    private readonly cb: StageClearCallbacks,
  ) {}

  enter(payload?: unknown): void {
    const p = payload as Partial<StageClearPayload> | undefined;
    // Spread over the DEFAULT, not over the previous payload: carrying the last
    // stage's numbers forward is how a stage with no coins shows the previous
    // stage's count.
    this.data = {
      level: 1,
      score: 0,
      coins: 0,
      coinTotal: 0,
      lives: 0,
      timeLeft: 0,
      perfect: false,
      rescued: false,
      ...(p ?? {}),
    };
    this.pressed = -1;
    this.shared = false;
  }

  exit(): void {
    this.pressed = -1;
  }

  update(_dt: number, _simTime: number): void {
    // Static screen: nothing animates, so nothing advances.
  }

  private get final(): boolean {
    return this.data.final === true;
  }

  private layout(): void {
    const content = menuContentRect(this.vp);
    const col = columnRect(this.vp, content.y, content.h);

    const homeY = content.y + content.h - SPACE.lg - BUTTON_H_SM;
    copyRect(
      this.regions[R_HOME]!,
      ctaRect(this.vp.fieldW, homeY, col.w * 0.5, BUTTON_H_SM),
    );
    copyRect(
      this.regions[R_NEXT]!,
      ctaRect(this.vp.fieldW, homeY - SPACE.md - BUTTON_H, col.w, BUTTON_H),
    );
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number, _simTime: number): void {
    this.layout();
    this.px = this.vp.refToDevice(1);

    ctx.fillStyle = COLORS.surfaceTinted;
    ctx.fillRect(0, 0, this.vp.fieldW, this.vp.fieldH);

    if (this.final) this.renderComplete(ctx);
    else this.renderTally(ctx);
  }

  // ── The ordinary stage clear ──────────────────────────────────────────────

  private renderTally(ctx: CanvasRenderingContext2D): void {
    const content = menuContentRect(this.vp);
    const col = columnRect(this.vp, content.y, content.h);
    const cx = this.vp.fieldW / 2;
    const d = this.data;

    label(ctx, COPY.stageClearTitle, cx, content.y + SPACE.lg, {
      size: TEXT.title,
      weight: WEIGHT.display,
      align: 'center',
      tone: 'primary',
      track: TRACK.display,
    });

    // Perfect beats rescued beats the stage's own line: the most specific true
    // statement wins. `punchlineRescued` never scolds.
    const punchline = d.perfect
      ? COPY.punchlinePerfect
      : d.rescued
        ? COPY.punchlineRescued
        : (COPY.levelPunchline[d.level - 1] ?? '');
    label(ctx, punchline, cx, content.y + SPACE.lg + SPACE.xl, {
      size: TEXT.body,
      align: 'center',
      tone: 'secondary',
    });

    // ── THE TALLY ────────────────────────────────────────────────────────────
    // Coins, time bonus and lives are the three things the stage pays out for,
    // and the score is what they add up to. Bonus rows are a star and a name.
    const rows: [string, string, boolean][] = [
      [COPY.receiptCoins, `${d.coins}/${d.coinTotal}`, false],
      [COPY.receiptTime, formatSeconds(d.timeLeft), false],
      [COPY.receiptLives, String(d.lives), false],
    ];
    if (d.perfect) rows.push([COPY.receiptPerfect, '', true]);
    if (d.coinTotal > 0 && d.coins >= d.coinTotal) rows.push([COPY.receiptSweep, '', true]);

    const innerW = col.w - SPACE.xl * 2;
    const markW = Math.min(200, innerW * 0.58);
    const markH = markHeight(markW, 'mark');
    const headH = SPACE.xl + markH + SPACE.md + SPACE.md;
    const totalH = SPACE.lg * 2 + TEXT.head;
    const top = content.y + SPACE.xxl + SPACE.md;
    const bottom = this.regions[R_NEXT]!.y - SPACE.lg;

    // The rows absorb the slack up to a ceiling, and the card is centred in the
    // band so a short tally does not leave a visibly different hole above the
    // buttons from a long one.
    const fixed = headH + totalH + SPACE.lg;
    const rowH = clamp((bottom - top - fixed) / rows.length, SPACE.xl, 52);
    const tallyH = Math.min(fixed + rows.length * rowH, bottom - top);
    const tally = rect(col.x, top + (bottom - top - tallyH) / 2, col.w, tallyH);

    card(ctx, tally, { tone: 'surface', elevated: true, radius: RADIUS.card });

    const innerX = tally.x + SPACE.xl;

    drawMarkCentered(ctx, tally.x + tally.w / 2, tally.y + SPACE.xl + markH / 2, markW);
    dashedDivider(
      ctx,
      innerX,
      tally.y + SPACE.xl + markH + SPACE.md,
      innerW,
      COLORS.borderStrong,
    );

    let y = tally.y + headH;
    for (const [name, value, bonus] of rows) {
      const r = rect(innerX, y, innerW, rowH);
      if (bonus) {
        // A bonus row is a STAR and a name: the same object the game uses for a
        // rating, and it reads as "you earned this".
        iconStar(ctx, r.x + 8, r.y + r.h / 2, 9, true);
        label(ctx, name, r.x + 24, r.y + r.h / 2, {
          size: TEXT.body,
          weight: WEIGHT.mid,
          color: COLORS.btnHero,
          track: TRACK.label,
        });
      } else {
        valueRow(ctx, r, name, value);
      }
      y += rowH;
    }

    dashedDivider(ctx, innerX, y + SPACE.sm, innerW, COLORS.borderStrong);
    valueRow(
      ctx,
      rect(innerX, y + SPACE.md, innerW, rowH),
      COPY.receiptScore,
      String(d.score),
      { size: TEXT.label, valueSize: TEXT.head },
    );

    button(ctx, this.regions[R_NEXT]!, COPY.nextLevel, {
      variant: 'hero',
      pressed: this.pressed === R_NEXT,
    });
    button(ctx, this.regions[R_HOME]!, COPY.quit, {
      variant: 'ghost',
      pressed: this.pressed === R_HOME,
      size: TEXT.body,
    });
  }

  // ── The end of the run ────────────────────────────────────────────────────

  private renderComplete(ctx: CanvasRenderingContext2D): void {
    const content = menuContentRect(this.vp);
    const col = columnRect(this.vp, content.y, content.h);
    const cx = this.vp.fieldW / 2;
    const d = this.data;
    const totals = d.totals;

    // Matches the ordinary tally's header, so the two screens share a shape.
    const markW = Math.min(200, col.w * 0.45);
    const markH = markHeight(markW, 'mark');
    const markY = content.y + SPACE.sm;
    drawMarkCentered(ctx, cx, markY + markH / 2, markW);

    const titleY = markY + markH + SPACE.xl;
    label(ctx, COPY.completeTitle, cx, titleY, {
      size: TEXT.head,
      weight: WEIGHT.display,
      align: 'center',
      tone: 'primary',
      track: TRACK.display,
    });
    label(ctx, COPY.winLine, cx, titleY + SPACE.xl, {
      size: TEXT.body,
      align: 'center',
      tone: 'secondary',
    });

    // The finale and the figures under it are centred as one group between the
    // header and the buttons.
    const groupTop = titleY + SPACE.xl + SPACE.xl;
    const groupBottom = this.regions[R_NEXT]!.y - SPACE.lg;
    const finaleH = 168;
    const rowH = SPACE.xl;
    const panelH = SPACE.lg * 2 + 4 * rowH + SPACE.xl + TEXT.title;
    const slack = Math.max(0, groupBottom - groupTop - finaleH - SPACE.lg - panelH);
    const finaleTop = groupTop + slack / 2;
    const finale = rect(col.x, finaleTop, col.w, finaleH);
    card(ctx, finale, { tone: 'quiet', radius: RADIUS.card });
    ctx.save();
    ctx.beginPath();
    ctx.rect(finale.x, finale.y, finale.w, finale.h);
    ctx.clip();
    this.drawFinale(ctx, finale);
    ctx.restore();

    const rows: [string, string][] = [
      [COPY.completeLevels, String(totals?.levels ?? 1)],
      [COPY.completeCoins, String(totals?.coins ?? d.coins)],
      [COPY.completeStreak, String(totals?.streak ?? 0)],
      [COPY.completePerfect, String(totals?.perfect ?? (d.perfect ? 1 : 0))],
    ];

    const top = finale.y + finale.h + SPACE.lg;
    const panel = rect(col.x, top, col.w, Math.min(panelH, groupBottom - top));
    card(ctx, panel, { tone: 'surface', elevated: true });

    const innerX = panel.x + SPACE.xl;
    const innerW = panel.w - SPACE.xl * 2;
    let y = panel.y + SPACE.lg;
    for (const [name, value] of rows) {
      valueRow(ctx, rect(innerX, y, innerW, rowH), name, value);
      y += rowH;
    }
    dashedDivider(ctx, innerX, y + SPACE.sm, innerW, COLORS.borderStrong);
    label(ctx, COPY.completeScore, innerX, y + SPACE.lg + SPACE.sm, {
      size: TEXT.label,
      tone: 'secondary',
      track: TRACK.label,
    });
    label(
      ctx,
      String(totals?.score ?? d.score),
      innerX + innerW,
      y + SPACE.lg + SPACE.xl + SPACE.sm,
      {
        size: TEXT.title,
        weight: WEIGHT.display,
        align: 'right',
        tone: 'primary',
        track: TRACK.display,
      },
    );

    // SHARE is the hero here: a player who has just cleared the whole run is far
    // more likely to tell somebody than to start again.
    button(ctx, this.regions[R_NEXT]!, COPY.shareBtn, {
      variant: this.shared ? 'secondary' : 'hero',
      pressed: this.pressed === R_NEXT,
    });
    button(ctx, this.regions[R_HOME]!, COPY.playAgain, {
      variant: 'ghost',
      pressed: this.pressed === R_HOME,
      size: TEXT.body,
    });
  }

  /**
   * The finale: the coin the hero has been collecting, the hero himself posed
   * on a win, and the goal standing open. Every figure is the game's own art.
   */
  private drawFinale(ctx: CanvasRenderingContext2D, r: Rect): void {
    const px = this.px;
    const ground = r.y + r.h - SPACE.lg;
    const cx = r.x + r.w / 2;

    // The floor they stand on: one flat fill in the girder's face colour.
    ctx.fillStyle = withAlpha(COLORS.girderFace, 0.5);
    ctx.fillRect(r.x + SPACE.lg, ground, r.w - SPACE.lg * 2, 4);

    drawCoinArt(ctx, cx - 96, ground - 30, px);
    drawAgentArt(ctx, cx - 4, ground, px, 'win', 1);
    drawGoalArt(ctx, cx + 92, ground, px, true);
  }

  onPointer(kind: PointerKind, _id: number, x: number, y: number, _t: number): void {
    if (kind === 'down') {
      this.pressed = hitTest(this.regions, x, y);
      return;
    }
    if (kind === 'cancel') {
      this.pressed = -1;
      return;
    }
    if (kind !== 'up') return;

    const hit = hitTest(this.regions, x, y);
    const was = this.pressed;
    this.pressed = -1;
    if (hit === -1 || hit !== was) return;

    if (this.final) {
      // Fired from inside the pointerup handler, NOT from a later frame: both
      // `navigator.share` and the async clipboard API require a transient user
      // activation, and that activation is gone by the next rAF tick.
      if (hit === R_NEXT) void shareRun(this.data).then((ok) => (this.shared = ok));
      else this.cb.onHome();
      return;
    }

    if (hit === R_NEXT) this.cb.onNext(this.data.level + 1);
    else if (hit === R_HOME) this.cb.onHome();
  }
}

/**
 * Seconds, as a figure: m:ss. The unit is drawn into the number rather than
 * stored in COPY, because it is the same symbol in every language.
 */
function formatSeconds(sec: number): string {
  const whole = Math.max(0, Math.round(sec));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * The OS share sheet, falling back to the clipboard. Resolves true when the text
 * actually went somewhere.
 *
 * Both paths are wrapped: `navigator.share` is absent on desktop and throws in a
 * cross-origin iframe without a transient activation, and an AbortError from the
 * player dismissing the sheet is a choice, not a failure.
 */
async function shareRun(d: StageClearPayload): Promise<boolean> {
  const text = `${COPY.shareText} ${d.totals?.score ?? d.score}`;
  // THE WEB URL, never IDENTITY.href: a share lands in somebody else's messages,
  // on a device that may not have the app, so a custom scheme is a dead string.
  const url = IDENTITY.webHref;

  // GA4's recommended `share`. `method` separates the OS sheet from the
  // clipboard fallback.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: IDENTITY.fullTitle, text, url });
      track('share', { method: 'os_sheet', screen: 'stageClear' });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return true;
  } catch {
    // No clipboard permission, or an insecure origin. Nothing worth interrupting
    // the player with.
    return false;
  }
}

function copyRect(dst: Rect, src: Rect): void {
  dst.x = src.x;
  dst.y = src.y;
  dst.w = src.w;
  dst.h = src.h;
}
