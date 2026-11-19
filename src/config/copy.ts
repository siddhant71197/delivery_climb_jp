/**
 * ══════════════════════════════════════════════════════════════════════════
 *  COPY — everything the GAME says.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: a re-skin that has to re-author forty strings
 * because each of them names the brand's collectible inline. A re-skin that
 * expensive gets done badly under time pressure, or not at all.
 *
 * ─── WHAT LIVES HERE AND WHAT LIVES IN THE BRAND ───────────────────────────
 *
 * The test is whether a string would be FALSE under a different brand, or
 * merely flavourless.
 *
 *   "コインを全部集めよう"              → HERE. Written with {collectiblePl}.
 *   "ゴールへ"                          → HERE. Written with {goal}.
 *   "てっぺんまで登ろう"                → brand.ad. False of any other brand.
 *
 * Strings here use {token} placeholders filled from the brand's `vocab` by
 * `t()` below. That is the mechanism that makes a re-skin cost four words
 * instead of forty sentences.
 *
 * ─── THE LEVEL NAMES ARE THE ONE DELIBERATE EXCEPTION ──────────────────────
 *
 * They are the GAME'S content — ten levels of a specific game — and a brand
 * module is not the place to re-author a game's level list. A brand that wants
 * different names overrides the array; that is a bigger ask than a vocab word
 * and it should look like one.
 */

import { VOCAB } from '../brand';

/**
 * Fill {placeholders} from the brand vocabulary.
 *
 * Throws on an unknown token rather than leaving it in the string. A `{gaol}`
 * typo that renders literally is a bug a player sees and a reviewer screenshots;
 * one that throws is a bug the first person to open that screen fixes.
 */
export function t(template: string, extra?: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (extra && key in extra) return String(extra[key]);
    if (key in VOCAB) {
      const v = VOCAB[key as keyof typeof VOCAB];
      // A vocab LIST is a list, and a list has no sensible rendering in the
      // middle of a sentence. Joining it would silently produce "Collect every
      // Biryani,Dosa,Samosa" — grammatical nonsense that no type error catches
      // and that reads as a data bug to whoever sees it on screen. A template
      // that wants one dish indexes the list and passes it through `extra`.
      if (typeof v !== 'string') {
        throw new Error(
          `copy: {${key}} is a list, not a word — index it and pass it via the extra map`,
        );
      }
      return v;
    }
    throw new Error(`copy: unknown token {${key}}`);
  });
}

/**
 * `t()`, with first-letter capitalisation.
 *
 * Japanese has no letter case, so this is `t()` and nothing more. The name is
 * kept so every call site still reads the same; the capitalising behaviour it
 * used to carry only ever mattered for Latin sentences.
 */
export function tSentence(template: string, extra?: Record<string, string | number>): string {
  return t(template, extra);
}

/**
 * `t()`, with whole-line upper-casing.
 *
 * Japanese has no case, so this is `t()` and nothing more. Kept so the one
 * display call site still reads as a deliberate choice.
 */
export function tUpper(template: string, extra?: Record<string, string | number>): string {
  return t(template, extra);
}

export const COPY = {
  // ── Level names ─────────────────────────────────────────────────────────
  // Ten stages, one name each. Shown in the masthead and on the level select.
  levelNames: [
    'はじまりの塔',
    '樽のラッシュ',
    'ゆれるエレベーター',
    'コンベアの上で',
    'かまどの炎をこえて',
    'はしごの迷路',
    'スクーターで爆走',
    'コインの階段',
    'ラッシュアワー',
    'てっぺんの決戦',
  ] as readonly string[],

  /** One per level, shown on the stage-clear tally. Indexed by level - 1. */
  levelPunchline: [
    '最初のコイン、最初のよろこび。',
    '樽をよけて、コインは無事。',
    'エレベーターに乗って、一気に上へ。',
    'ベルトコンベアの上を、あなたが進む。',
    '炎をかわして、まっすぐ上へ。',
    'はしごを見失わず、迷わず登れ。',
    'スクーターより速いのは、あなただけ。',
    '次の階へ、コインは点々と。',
    'ラッシュアワーも、落ち着いて。',
    '全部集めた。てっぺんはもうすぐ。',
  ] as readonly string[],

  /** Overrides the per-level line when earned. */
  punchlinePerfect: 'ミスなし、言い訳なし。',
  /** After a rescue or a skip. NEVER scolding — a player who struggled and
   *  finished is a player who finished. */
  punchlineRescued: '遅れたけど、ちゃんとクリアできました。大丈夫。',

  // ── HUD ─────────────────────────────────────────────────────────────────
  hudTimer: 'タイム',
  hudLives: 'チャンス',
  hudScore: 'スコア',
  /** The coin tracker's label, in the HUD's left third. */
  hudCoins: 'コイン',

  // ── The gate ────────────────────────────────────────────────────────────
  //
  // The gate needs every coin, so this talks about `{items}` rather than
  // naming one of them.
  gateOpenToast: '{items}が全部そろった！ゴールが開いた！',

  // ── Splash ──────────────────────────────────────────────────────────────
  play: 'はじめる',
  howToPlay: '遊び方',
  levels: 'ステージ',
  highScore: 'ベストスコア',

  // ── Rules ───────────────────────────────────────────────────────────────
  rulesTitle: '遊び方',
  rules: [
    {
      title: 'はしごで上に登る',
      body: 'はしごをつかんで、上の階へ登りましょう。階をまたいでジャンプはできません。',
    },
    {
      title: '{items}を全部集める',
      body: '{goal}の扉は、{collectiblePl}をすべて集めるまで開きません。今いる階のものは、ついでに拾っていきましょう。',
    },
    {
      title: '{goal}へ',
      body: '最上階の{goal}にたどり着けば、ステージクリア。',
    },
    {
      title: 'ジャンプでよける',
      body: '{villain}が{hazardPl}を転がしてきます。ジャンプで飛び越えると得点、2つ同時に飛び越えるとさらに高得点。',
    },
  ] as readonly { title: string; body: string }[],
  rulesControls: '左のパッドで移動・はしご。右のボタンでジャンプ。画面のどこでも上にスワイプしてもOK。',
  rulesStart: 'わかった',

  // ── Level select ────────────────────────────────────────────────────────
  levelSelectTitle: 'ステージを選ぶ',
  levelLocked: 'ロック中',
  levelBest: 'ベスト',

  // ── Play ────────────────────────────────────────────────────────────────
  ready: 'スタート！',
  paused: '一時停止',
  resume: '再開',
  restart: 'やり直す',
  quit: 'ホーム',
  timeUp: 'タイムアップ！',

  // ── Stage clear ─────────────────────────────────────────────────────────
  stageClearTitle: 'ステージクリア',
  /** The tally rows: coins collected, the time bonus, tries kept, bonuses. */
  receiptCoins: 'コイン',
  receiptTime: 'タイムボーナス',
  receiptLives: 'チャンス',
  receiptPerfect: 'パーフェクト',
  receiptSweep: 'コイン全回収',
  /** The label on the tally's final line, above the score. */
  receiptScore: 'スコア',
  nextLevel: '次のステージ',
  /** The line under the stage-clear title when the run is complete. */
  winLine: '最上階まで登りきりました！ありがとうございます！',

  // ── Game over ───────────────────────────────────────────────────────────
  gameOverTitle: 'チャンス切れ',
  /** The line under the game-over title. */
  loseLine: '次こそ、時間内にてっぺんまで。',
  retryPrompt: 'もう一度挑戦しますか？',
  continueBtn: 'つづける',

  // ── Share ───────────────────────────────────────────────────────────────
  /** Prefix to the score in a shared message: "ゲームのスコア: 1234". */
  shareText: 'ゲームのスコア:',

  // ── Game complete ───────────────────────────────────────────────────────
  completeTitle: '全ステージクリア！',
  completeLevels: 'ステージ',
  completeCoins: 'コイン',
  completeStreak: '最長連続',
  completePerfect: 'パーフェクト',
  completeScore: '最終スコア',
  shareBtn: 'シェア',
  playAgain: 'もう一度',

  // ── Toasts ──────────────────────────────────────────────────────────────
  /**
   * The helmet absorbing a hit. Popped over the hero on the frame he would
   * otherwise have died. It names nothing, because the beat is about the player.
   */
  toastHelmetSave: 'セーフ！',
} as const;
