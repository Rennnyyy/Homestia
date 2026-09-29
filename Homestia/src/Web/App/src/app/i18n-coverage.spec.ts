/**
 * Every translation key the SDK's components ask for is answered by this app's bundle.
 *
 * The SDK ships no translation files on purpose: a library cannot know what a host calls a
 * "column", an "upload" or a "stage". Its components therefore ask for keys in the HOST's bundle
 * and carry an English fallback — so a key nobody added does not blank the page, it quietly reads
 * English in every language. That is the failure this file exists for: "the German page is still
 * half English" is not something code review catches, because the missing thing is absent from
 * every diff.
 *
 * The keys are read out of the INSTALLED packages, which ship their sources — not out of a list
 * kept here, which would be one more thing to forget. A key a future SDK release starts asking for
 * fails this test instead of appearing as `entityForm.objectPending` in the UI.
 *
 * Components this app does not render are named below, with a reason. Their absence is then a
 * decision rather than an oversight.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Bundle = Record<string, string>;

/**
 * Paths are taken from the runner's working directory, which is this project. `import.meta.url` is
 * not a file URL under the bundling test runner, so it cannot address `node_modules`.
 */
const ROOT = process.cwd();

const loadBundle = (lang: 'en' | 'de'): Bundle =>
  JSON.parse(readFileSync(join(ROOT, 'src/assets/i18n', `${lang}.json`), 'utf8')) as Bundle;

const en = loadBundle('en');
const de = loadBundle('de');

/** Every `.ts`/`.html` file under a directory, recursively — specs excluded, they assert, not ask. */
function sources(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const child = `${root}/${entry.name}`;
    if (entry.isDirectory()) found.push(...sources(child));
    else if (/\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) found.push(child);
  }
  return found;
}

/** The SDK packages this app consumes. Both ship their `src`, which is what a key is asked in. */
const SDK_SOURCES: string[] = ['aletheia-ui', 'aletheia-core'].flatMap((pkg) =>
  sources(join(ROOT, 'node_modules/@rennnyyy', pkg, 'src')),
);

/**
 * A key as the SDK writes one: a quoted dotted literal. Nothing else in these sources looks like
 * that — a scan for it returns exactly the translation keys, with no noise to filter.
 */
const QUOTED_KEY = /'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)'/g;

/** The keys the installed SDK asks for, each with the file that asks. */
function keysAskedByTheSdk(): Map<string, string> {
  const asked = new Map<string, string>();
  for (const file of SDK_SOURCES) {
    for (const [, key] of readFileSync(file, 'utf8').matchAll(QUOTED_KEY)) {
      if (!asked.has(key)) asked.set(key, file.slice(file.lastIndexOf('/') + 1));
    }
  }
  return asked;
}

/**
 * SDK components this app does not render, by key namespace. Named rather than silently skipped:
 * the view-aspect form is the admin app's surface, and this app's voice control is its own AI
 * panel, not the SDK's recorder.
 */
const NOT_RENDERED_HERE: Record<string, string> = {
  viewForm: 'the view-aspect form is the admin app’s surface',
  voiceRecorder: 'this app records voice in its own AI panel, not the SDK’s recorder',
};

const namespaceOf = (key: string): string => key.slice(0, key.indexOf('.'));

describe('the translation bundles', () => {
  it('answers every key the SDK components ask for, in both languages', () => {
    const unanswered = [...keysAskedByTheSdk()]
      .filter(([key]) => !(namespaceOf(key) in NOT_RENDERED_HERE))
      .filter(([key]) => !(key in en) || !(key in de))
      .map(([key, asker]) => `${key} (asked by ${asker})`);

    expect(unanswered).toEqual([]);
  });

  it('holds the same keys in both languages', () => {
    expect(Object.keys(en).filter((key) => !(key in de))).toEqual([]);
    expect(Object.keys(de).filter((key) => !(key in en))).toEqual([]);
  });
});
