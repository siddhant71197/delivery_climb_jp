/**
 * ══════════════════════════════════════════════════════════════════════════
 *  AD SLOT — the sticky bottom banner (320×50), and the GAM integration point.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * THE FAILURE THIS FILE PREVENTS: a rewrite on the day real demand is wired in.
 * A live ad tag — GPT, AdSense, IMA — renders its own cross-origin iframe. An
 * iframe cannot paint into a 2D context, so a banner drawn on the canvas is
 * artwork that gets thrown away the first time anybody sells this inventory.
 * So the banner is DOM, and `mountAdCreative()` IS the integration point: it
 * hands back the container GAM renders into.
 *
 * The markup (frame, disclosure label, `#gam-banner-320x50`) lives in
 * index.html as a placeholder. This module binds to it and sizes it from the
 * AD block in src/config/theme.ts.
 *
 * ─── VISIBILITY ─────────────────────────────────────────────────────────────
 *
 * The banner is shown on every scene, including live play. The play layout
 * reserves its height (see src/render/layout.ts), so it never sits over the
 * pad controls.
 *
 */

import { AD } from '../config/theme';
import type { Viewport } from '../render/canvas';

let root: HTMLElement | null = null;
let creative: HTMLElement | null = null;
let visible = false;

export function initAdSlot(): void {
  if (!AD.enabled) return;
  root = document.getElementById('ad-slot');
  if (!root) return;

  const frame = root.querySelector<HTMLElement>('#ad-frame');
  creative = root.querySelector<HTMLElement>('#ad-creative');
  if (frame) {
    frame.style.width = `min(100%, ${AD.maxWidth}px)`;
    frame.style.height = `${AD.height}px`;
  }
  const label = root.querySelector<HTMLElement>('#ad-label');
  if (label) label.textContent = AD.label;
}

export function showAd(): void {
  if (!root || visible) return;
  visible = true;
  root.dataset['hidden'] = 'false';
}

export function hideAd(): void {
  if (!root || !visible) return;
  visible = false;
  // The CSS on #ad-slot[data-hidden] also sets pointer-events:none, so a tap
  // on a banner that is visually gone cannot land in the hit-test tree.
  root.dataset['hidden'] = 'true';
}

export function setAdVisible(v: boolean): void {
  if (v) showAd();
  else hideAd();
}

/** Whether the banner is currently shown. Debug and tests; main.ts drives it. */
export function isAdVisible(): boolean {
  return visible;
}

/**
 * Vertical space the banner occupies, in REFERENCE UNITS, for layout that must
 * keep content clear of it.
 *
 * MEASURED OFF THE LIVE ELEMENT rather than computed from AD.height, because the
 * slot's padding includes `env(safe-area-inset-bottom)` — a number that only the
 * browser knows. Returns 0 when the slot is disabled or absent.
 */
export function adReservedRef(vp: Viewport): number {
  if (!AD.enabled || !root) return 0;
  const cssHeight = root.offsetHeight || AD.height + 12;
  return cssHeight / vp.scale;
}

/**
 * The GAM banner container, `#gam-banner-320x50`. Hand it to GAM:
 *
 *   const el = mountAdCreative();
 *   if (el) googletag.cmd.push(() => googletag.display(el.id));
 *
 * Returns the existing placeholder node (it is not replaced), so the id stays
 * stable for googletag.display(). Null when the slot is disabled or absent.
 */
export function mountAdCreative(): HTMLElement | null {
  if (!creative) return null;
  let el = creative.querySelector<HTMLElement>('#gam-banner-320x50');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gam-banner-320x50';
    creative.appendChild(el);
  }
  return el;
}
