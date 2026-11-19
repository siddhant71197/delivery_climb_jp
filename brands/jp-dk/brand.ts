/**
 * ══════════════════════════════════════════════════════════════════════════
 *  JP-DK — the brand module.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A brand-neutral, Japanese-themed skin. Every value here is a placeholder
 * chosen to be generic: no real company, product or trademark is referenced.
 *
 * TO BUILD THIS GAME FOR A DIFFERENT BRAND: copy this directory, edit the
 * values, drop replacement artwork into `public/brand/`, then
 * `BRAND=<slug> npm run build`. Nothing under `src/` changes. That is the
 * whole contract, and `npm run check:brand` is what keeps it true.
 *
 * Colour literals belong in this module only. The build gate (tools/gate.mjs)
 * enforces that nothing under src/ carries a colour of its own.
 */

import type {
  BrandAd,
  BrandColors,
  BrandCopy,
  BrandIdentity,
  BrandLogo,
  BrandShape,
  BrandType,
  BrandVocabulary,
} from '../../src/brand/types';

export const identity = {
  name: 'jp-dk',
  shortName: 'jp-dk',
  slug: 'jp-dk',
  gameTitle: 'ジャンプ・コイン・クライム',
  fullTitle: 'jp-dk ジャンプ・コイン・クライム',
  tagline: 'コインを集めて、てっぺんまで。',
  url: 'example.jp',
  /** Placeholder destination. No app deeplink is generated. */
  href: 'https://example.jp',
  /** Same placeholder as `href`: there is no app behind this unit yet. */
  webHref: 'https://example.jp',
} satisfies BrandIdentity;

export const colors = {
  /** Indigo (ai-iro), a traditional dye colour. */
  primary: '#2B4C7E',
  primaryHover: '#23406B',
  primaryPressed: '#1C3459',

  /** Gold-tan, used sparingly for emphasis and reward. */
  secondary: '#D9A441',
  secondaryDeep: '#B8842A',

  /** The primary's tint ramp, darkest first. */
  tints: ['#1E3A60', '#4A6A94', '#8AA3BF', '#C5D2E2', '#F3F6FA'],

  paper: '#FFFFFF',
  faint: '#F4F5F7',
  muted: '#E9EBEF',
  line: '#D0D4DC',
  dim: '#9AA0AD',
  subtle: '#6A7080',
  strong: '#3A3F4D',
  ink: '#101418',

  surfaceDark: '#1B2030',
  primaryWash: '#E6ECF5',

  informative: '#2E8B6B',
  positive: '#2E8B6B',
  caution: '#D9A441',
  negative: '#C8443C',

  wordmarkTint: '#2B4C7E',

  /** The collectible: a charm with a gold body and a vermilion cord. */
  collectible: {
    body: '#F2C94C',
    highlight: '#FFE08A',
    shade: '#B88A1E',
    gem: '#C8443C',
    bead: '#FFF8E7',
    outline: '#101418',
  },

  /** The cast: a light skin tone for the courier, a dark-brown fur for the villain. */
  characters: {
    skin: '#E0B08A',
    skinShade: '#B9825C',
    hair: '#1C1712',
    fur: '#7A5C42',
    furDark: '#54402F',
  },

  /**
   * THE HERO: a red-capped plumber. Representational, like `characters`, so
   * these are NOT brand values and do not move when the brand's primary does.
   * Red cap and shirt, blue overalls, brass buttons, brown boots, white gloves.
   * Deliberately not Mario's exact palette: the shade steps and the badge are
   * this game's own.
   */
  hero: {
    cap: '#D62828',
    capShade: '#A81E1E',
    badge: '#FFF8E7',
    shirt: '#E03A3A',
    shirtShade: '#B02A2A',
    overalls: '#3F86E0',
    overallsShade: '#2A65BA',
    button: '#F2C94C',
    boot: '#6B3E1E',
    glove: '#FFFFFF',
    skin: '#F0C09A',
    skinShade: '#C98D66',
    moustache: '#3B2416',
    outline: '#101418',
  },

  /** THE COIN: the collectible. Gold body, a paler face, a darker rim. */
  coin: {
    body: '#F5C842',
    highlight: '#FFF1A8',
    shade: '#C9921C',
    ring: '#A8741A',
    outline: '#101418',
  },

  /** THE GOAL DOOR, at the top of the tower. Closed is a solid leaf; open is lit. */
  goal: {
    frame: '#3A3F4D',
    panel: '#5A6178',
    open: '#FFE58A',
    knob: '#F2C94C',
    outline: '#101418',
  },

  accents: [
    '#2B4C7E',
    '#D9A441',
    '#2E8B6B',
    '#C8443C',
    '#4A6A94',
    '#8AA3BF',
    '#C5D2E2',
    '#F3F6FA',
    '#1B2030',
    '#6A7080',
    '#D0D4DC',
    '#EEF0F5',
  ],

  roles: {
    reward: ['#F2C94C', '#FFE08A', '#D9A441'],
    hazard: ['#3A3F4D', '#1B2030', '#C8443C'],
    neutral: ['#FFFFFF', '#EEF0F5', '#6A7080', '#101418'],
  },
} satisfies BrandColors;

export const type = {
  /**
   * Japanese system faces first, then a broadly available fallback. Nothing
   * here is downloaded: the stack relies on fonts already on the device.
   */
  stack:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Noto Sans JP", "Meiryo", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  weights: { body: 400, mid: 500, display: 800 },
  leading: { display: 1.2, body: 1.5 },
  shadow: '0 3px 15px 0 rgba(16, 20, 24, 0.3)',
  shadowSoft: '0 2px 8px rgba(16, 20, 24, 0.2)',
} satisfies BrandType;

export const shape = {
  card: 14,
  button: 10,
  pill: 999,
  /** The superellipse exponent used for the squircle plate. */
  squircle: 4.2,
} satisfies BrandShape;

export const ad = {
  headline: 'てっぺんまで登ろう',
  cta: '今すぐ遊ぶ',
} satisfies BrandAd;

export const vocab = {
  /** The hero: the player's character. */
  hero: 'ヒーロー',
  heroShort: 'ヒーロー',
  /** The villain: the monkey who throws the barrels. */
  villain: '大ザル',
  /** The goal at the top of each stage. */
  goal: 'ゴール',
  /** The collectible: a coin, collected on the way up. */
  collectible: 'コイン',
  collectiblePl: 'コイン',
  items: 'コイン',
  /** The hazard: a barrel the monkey throws. */
  hazard: '樽',
  hazardPl: '樽',
  /** The power-up pickups: helmet, turbo, shoyu. */
  powerup: 'アイテム',
  /** The verb for the core action of the game. */
  climbVerb: '登る',
  ctaShort: '詳しく',
} satisfies BrandVocabulary;

export const copy = {
  bootLine: 'コインを集めて、てっぺんへ…',
  splashKicker: 'はしごを登って、コインを全部集めよう。',
  winLine: '最上階まで登りきりました！コインも全部。',
  loseLine: 'チャンス切れ。大ザルはまだ見下ろしています。',
  easterEgg: '（最上階のゴールの隅に、小さな梅の花が咲いていた。）',
  a11y:
    'jp-dk ジャンプ・コイン・クライム。ヒーローとして鉄骨とはしごを登り、すべてのコインを集め、' +
    '大ザルが投げる樽をよけながら、制限時間内にゴールへたどり着こう。',
  shareText: 'ジャンプ・コイン・クライムで全部のコインを集めました。スコアで勝負！',
} satisfies BrandCopy;

export const logo = {
  /**
   * THE MARK: a generic paper mountain on a primary plate. It has no text, so it
   * carries no name or trademark.
   *
   * The artwork is carried IN THIS FILE as an SVG data URI, not as a file under
   * public/. A data URI cannot 404, so the mark is on the boot overlay on the
   * first frame, and the gate still reads the declared viewBox (R15). The
   * percent-encoded body is the SVG source exactly; edit it by decoding, not by
   * hand-typing a new one.
   */
  mark: {
    src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20100%20100%22%20width=%22100%22%20height=%22100%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20rx=%2222%22%20fill=%22%232B4C7E%22/%3E%3Cpath%20d=%22M16%2074%20L40%2034%20L54%2056%20L63%2044%20L84%2074%20Z%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
    aspect: 1,
    // The plate is filled, so the mark cannot be knocked out.
    opaque: true,
  },

  /** The tab icon: the same artwork as the mark. */
  favicon: {
    src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20100%20100%22%20width=%22100%22%20height=%22100%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20rx=%2222%22%20fill=%22%232B4C7E%22/%3E%3Cpath%20d=%22M16%2074%20L40%2034%20L54%2056%20L63%2044%20L84%2074%20Z%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
    aspect: 1,
  },

  /**
   * Drawn before the artwork has decoded, and at sizes where no raster
   * resolves. `plate-ellipse` is a rounded plate with an inset disc. It is
   * generic and carries no text, so it matches the artwork's neutrality.
   */
  fallback: { shape: 'plate-ellipse', insetX: 0.22, insetY: 0.22 },

  /** The mark is used as a content mask. */
  maskable: true,

  /** A one-colour cut of the mark is a legitimate use. */
  knockout: true,
} satisfies BrandLogo;

/**
 * NO OVERRIDES. The derivation in src/brand/theme.ts supplies every semantic
 * token, so this brand has nothing to correct.
 */
export const theme: Readonly<Record<string, string>> = {};
