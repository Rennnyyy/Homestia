#!/usr/bin/env node
/**
 * Entity vocabulary for the i18n bundles.
 *
 * The SDK's components own no entity words: they ask THIS bundle for
 * `entities.<path>.properties.<property>.label` (and `.label` / `.values.<key>.label`
 * for a definition and its enumeration values, see EntitySemanticsService) and
 * carry the backend's own label only as a fallback. A key nobody wrote is not a
 * broken page but a logged warning on every render plus an English word in the
 * middle of a German screen — silent, and no diff shows it.
 *
 * The backend already names every entity, property and enumeration value
 * (English mandatory, translations optional), and `model.json` is that answer on
 * disk. This script seeds the bundle from it, so a new entity, a renamed
 * property or a new enumeration value is one command away instead of a hunt
 * through the console.
 *
 * It only ADDS keys, and never rewrites or deletes one: a word this app wants to
 * say differently is written by hand and survives every run. `--check` reports
 * what is missing and exits non-zero, so CI can hold the bundles to the model.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'de'];

/** entity path -> [{ key, labels }], in the model's own order. */
function vocabulary() {
  const { entityDefinitions } = JSON.parse(readFileSync(join(root, 'model.json'), 'utf8'));
  const occurrences = entityDefinitions.reduce((counts, entity) => {
    counts[entity.entityPath] = (counts[entity.entityPath] ?? 0) + 1;
    return counts;
  }, {});

  const order = [];
  const byPath = new Map();
  for (const entity of entityDefinitions) {
    const path = entity.entityPath;
    if (!byPath.has(path)) {
      byPath.set(path, []);
      order.push([path, byPath.get(path)]);
    }
    const entries = byPath.get(path);

    // Several definitions share one root — a Property, a Room and a Studio are
    // all `segmentations`, and they share its property vocabulary. Their own
    // labels differ, so a shared root names no entity.
    if (occurrences[path] === 1 && entity.labels) entries.push({ key: `entities.${path}.label`, labels: entity.labels });

    for (const group of ['properties', 'owningRelations', 'incomingRelations']) {
      for (const property of entity[group] ?? []) {
        const key = `entities.${path}.properties.${property.propertyName}.label`;
        if (property.labels && !entries.some((entry) => entry.key === key)) {
          entries.push({ key, labels: property.labels });
        }
      }
    }
    for (const value of entity.enumerationValues ?? []) {
      const key = `entities.${path}.values.${value.key}.label`;
      if (value.labels && !entries.some((entry) => entry.key === key)) {
        entries.push({ key, labels: value.labels });
      }
    }
  }
  return order;
}

const check = process.argv.includes('--check');
let missing = 0;

for (const lang of LANGS) {
  const file = join(root, 'src', 'assets', 'i18n', `${lang}.json`);
  const bundle = JSON.parse(readFileSync(file, 'utf8'));
  const additions = [];

  for (const [, entries] of vocabulary()) {
    for (const { key, labels } of entries) {
      if (key in bundle) continue;
      const text = labels[lang];
      if (!text) {
        console.error(`${lang}: the model names no label for ${key}`);
        process.exitCode = 1;
        continue;
      }
      additions.push([key, text]);
    }
  }

  missing += additions.length;
  if (check) {
    for (const [key] of additions) console.error(`${lang}: missing ${key}`);
    if (!additions.length) console.log(`${lang}: complete`);
    continue;
  }
  for (const [key, text] of additions) bundle[key] = text;
  if (additions.length) writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${lang}: ${additions.length} added, ${Object.keys(bundle).length} keys`);
}

if (check && missing) {
  console.error(`\n${missing} entity label(s) missing — run: npm run i18n:entities`);
  process.exitCode = 1;
}
