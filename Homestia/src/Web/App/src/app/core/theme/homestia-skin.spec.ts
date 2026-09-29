/**
 * The skin registry: Homestia is the ONLY skin. There is no user-facing skin
 * selector — the SDK's built-ins are deliberately not registered, so nothing can
 * switch the app away from its own design.
 */
import { describe, expect, it } from 'vitest';
import { HOMESTIA_SKIN, HOMESTIA_SKINS } from './homestia-skin';

describe('HOMESTIA_SKINS', () => {
  it('registers the Homestia skin first, so it is the default', () => {
    expect(HOMESTIA_SKINS[0]).toBe(HOMESTIA_SKIN);
    expect(HOMESTIA_SKIN.id).toBe('homestia');
    expect(HOMESTIA_SKIN.label).toBe('Homestia');
  });

  it('registers no other skin — the SDK built-ins stay out', () => {
    expect(HOMESTIA_SKINS).toHaveLength(1);
    expect(HOMESTIA_SKINS.map((skin) => skin.id)).toEqual(['homestia']);
  });
});
