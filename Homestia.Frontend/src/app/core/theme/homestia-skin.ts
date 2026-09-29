import { type SkinDefinition } from '@rennnyyy/aletheia-tokens';

/**
 * The skins Homestia offers — exactly one.
 *
 * Homestia IS its skin: there is no user-facing skin selector and no fallback to
 * the SDK's built-ins (`native`, `ergonomic`), because the design is not a
 * variation of theirs. Registering it alone makes it the default and the only
 * option, and `index.html` pre-sets `data-skin="homestia"` so the very first
 * paint is already themed. The CSS lives in `src/styles/homestia-skin.css`.
 */
export const HOMESTIA_SKIN: SkinDefinition = { id: 'homestia', label: 'Homestia' };

export const HOMESTIA_SKINS: readonly SkinDefinition[] = [HOMESTIA_SKIN];
