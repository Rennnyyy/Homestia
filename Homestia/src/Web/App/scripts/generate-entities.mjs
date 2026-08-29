#!/usr/bin/env node
/**
 * Generates TypeScript entity files from a running Aletheia backend.
 *
 * Usage:
 *   node scripts/generate-entities.mjs [--with-enum-values] [backendUrl]
 *   npm run generate-entities
 *   npm run generate-entities -- --with-enum-values
 *
 * Flags:
 *   --with-enum-values   Also fetch actual enum values for enumeration entities.
 */

let withEnumValues = false;
const positionalArgs = [];
for (const arg of process.argv.slice(2)) {
  if (arg === '--with-enum-values') {
    withEnumValues = true;
  } else {
    positionalArgs.push(arg);
  }
}
const BACKEND_URL = positionalArgs[0] ?? 'http://localhost:5001';
const ENTITIES_DIR = new URL('../src/app/entities/', import.meta.url).pathname;
const ENTITY_DEFS_URL = `${BACKEND_URL}/api/entities/entity-definitions`;

// ── REST path overrides ────────────────────────────────────────────────
const REST_PATH_OVERRIDES = {
  property: 'properties',
  inventoryItem: 'inventory-items',
  commonArea: 'common-areas',
  landlord: 'landlords',
  room: 'rooms',
  studio: 'studios',
  agent: 'agents',
  tenant: 'tenants',
  rental: 'rentals',
};

// ── Inheritance map (child predicatePath → parent predicatePath) ─────
// When sample inference fails (no items in DB), inherited properties
// are resolved from the parent entity's definition instead.
const INHERITANCE_MAP = {
  room: 'segmentations',
  commonArea: 'segmentations',
  studio: 'segmentations',
  property: 'segmentations',
};

function restPath(def) {
  return REST_PATH_OVERRIDES[def.predicatePath] ?? def.entityPath;
}

// ── Type mapping ──────────────────────────────────────────────────────
const CLR_TO_TS = {
  String: 'string', Decimal: 'number', Int32: 'number', Int64: 'number',
  Boolean: 'boolean', DateTime: 'string', EntityRef: 'string | null', Object: 'unknown',
};

function tsType(clrType, isCollection) {
  const base = CLR_TO_TS[clrType] ?? 'unknown';
  return isCollection ? `${base}[]` : base;
}

function toPascalCase(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
function toCamelCase(str) { return str.charAt(0).toLowerCase() + str.slice(1); }

// ── Generate entity file ──────────────────────────────────────────────
function generateEntityFile(def, enumValues, extraProps, defByIri) {
  const ifaceName = toPascalCase(def.predicatePath);
  const entityConstName = `${ifaceName}Entity`;
  const ifaceProps = [];
  const skipNames = new Set(['ClrTypeIdentifier', 'Iri']);

  for (const p of def.properties) {
    if (skipNames.has(p.propertyName)) continue;
    ifaceProps.push(`  /** ${p.predicate} */`);
    ifaceProps.push(`  ${toCamelCase(p.propertyName)}: ${tsType(p.clrType, false)};`);
  }
  for (const r of def.owningRelations) {
    ifaceProps.push(`  /** ${r.predicate} → ${r.relatedEntityName} */`);
    ifaceProps.push(`  ${toCamelCase(r.propertyName)}: ${r.isCollection ? 'unknown[]' : 'unknown'};`);
  }
  ifaceProps.push(`  /** The entity's unique IRI. */`);
  ifaceProps.push(`  iri: string;`);

  if (extraProps && extraProps.length > 0) {
    for (const p of extraProps) {
      ifaceProps.push(`  /** Inherited — resolved from entity hierarchy. */`);
      ifaceProps.push(`  ${p.name}: ${tsType(p.type, p.isCollection)};`);
    }
  }

  const entityProps = [];
  for (const p of def.properties) {
    if (skipNames.has(p.propertyName)) continue;
    entityProps.push(`    { name: '${toCamelCase(p.propertyName)}', type: '${p.clrType}', isCollection: false },`);
  }
  for (const r of def.owningRelations) {
    const target = defByIri.get(r.relatedEntityDefinitionIri);
    const targetPath = target ? restPath(target) : undefined;
    const extra = targetPath ? `, targetEntityPath: '${targetPath}'` : '';
    entityProps.push(`    { name: '${toCamelCase(r.propertyName)}', type: 'EntityRef', isCollection: ${r.isCollection}${extra} },`);
  }
  if (extraProps && extraProps.length > 0) {
    for (const p of extraProps) {
      entityProps.push(`    { name: '${p.name}', type: '${p.type}', isCollection: ${p.isCollection} },`);
    }
  }

  const lines = [
    `// Auto-generated from ${ENTITY_DEFS_URL} — do not edit manually.`,
    `// Entity: ${def.name}  |  predicatePath: "${def.predicatePath}"  |  enum: ${def.isEnumeration}`,
    '',
    `import type { EntityInfo } from '../shared/services/aletheia-http-client.models';`,
    '',
    '// ── API response interface ────────────────────────────────────────────────',
    '',
    `export interface ${ifaceName} {`,
    ifaceProps.join('\n'),
    '}',
    '',
    '// ── Dynamic form definition ───────────────────────────────────────────────',
    '',
    `/** Pass to &lt;app-dynamic-entity-form [entity]="${entityConstName}"&gt; */`,
    `export const ${entityConstName}: EntityInfo = {`,
    `  entityPath: '${restPath(def)}',`,
    `  predicatePath: '${def.predicatePath}',`,
    `  displayName: '${def.name}',`,
    '  properties: [',
    entityProps.join('\n'),
    '  ],',
    '};',
  ];

  if (def.isEnumeration && enumValues && enumValues.length > 0) {
    const entries = enumValues.map((v) => `  ${JSON.stringify(v.key)}: ${JSON.stringify(v.displayName)},`);
    lines.push('');
    lines.push('// ── Enumeration values ─────────────────────────────────────────────────');
    lines.push('');
    lines.push('/** Valid keys for this enumeration. */');
    lines.push(`export const ${ifaceName}Values = {`);
    lines.push(entries.join('\n'));
    lines.push('} as const;');
    lines.push('');
    lines.push(`/** Union type of valid keys. */`);
    lines.push(`export type ${ifaceName}Key = keyof typeof ${ifaceName}Values;`);
  }

  lines.push('');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`Fetching ${ENTITY_DEFS_URL}...`);
  const res = await fetch(ENTITY_DEFS_URL);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  const data = await res.json();
  const items = data.items ?? [];
  if (items.length === 0) { console.log('No entities found.'); return; }

  const enumValueMap = new Map();
  if (withEnumValues) {
    const enums = items.filter((d) => d.isEnumeration);
    if (enums.length > 0) {
      console.log(`Fetching enumeration values for ${enums.length} enums...`);
      for (const def of enums) {
        const url = `${BACKEND_URL}/api/entities/${restPath(def)}`;
        try {
          const r = await fetch(url);
          if (r.ok) {
            const d = await r.json();
            enumValueMap.set(def.predicatePath, d.items ?? []);
            console.log(`  ✓ ${def.name} (${d.items?.length ?? 0} values)`);
          }
        } catch (err) { console.log(`  ✗ ${def.name}`); }
      }
    }
  }

  const inferredProps = new Map();
  const nonEnums = items.filter((d) => !d.isEnumeration);
  if (nonEnums.length > 0) {
    console.log(`Inferring inherited properties for ${nonEnums.length} entities...`);
    for (const def of nonEnums) {
      const url = `${BACKEND_URL}/api/entities/${restPath(def)}`;
      try {
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          const sample = d.items?.[0];
          if (sample && typeof sample === 'object') {
            const known = new Set([
              ...def.properties.map((p) => p.propertyName.toLowerCase()),
              ...def.owningRelations.map((r) => r.propertyName.toLowerCase()),
            ]);
            const extra = [];
            for (const key of Object.keys(sample)) {
              if (key === 'iri' || known.has(key.toLowerCase())) continue;
              const val = sample[key];
              extra.push({
                name: key,
                type: Array.isArray(val) ? 'EntityRef' : typeof val === 'boolean' ? 'Boolean' : typeof val === 'number' ? 'Decimal' : 'String',
                isCollection: Array.isArray(val),
              });
            }
            if (extra.length > 0) {
              inferredProps.set(def.predicatePath, extra);
              console.log(`  ✓ ${def.name} — +${extra.length} inherited (${extra.map((e) => e.name).join(', ')})`);
            }
          }
        }
      } catch (err) {
        console.warn(`  ⚠ ${def.name} — cannot infer inherited properties (${err.message ?? err})`);
      }
    }

    // ── Inheritance-based fallback ───────────────────────────────────
    // For entities whose sample inference failed, resolve inherited
    // properties from the parent entity's definition.
    for (const def of nonEnums) {
      if (inferredProps.has(def.predicatePath)) continue; // already resolved via sample

      const parentPath = INHERITANCE_MAP[def.predicatePath];
      if (!parentPath) continue;

      const parentDef = items.find((d) => d.predicatePath === parentPath);
      if (!parentDef) {
        console.warn(`  ⚠ ${def.name} — parent entity "${parentPath}" not found in definitions`);
        continue;
      }

      const ownNames = new Set([
        ...def.properties.map((p) => p.propertyName.toLowerCase()),
        ...def.owningRelations.map((r) => r.propertyName.toLowerCase()),
      ]);

      const inherited = [];
      // Collect parent's own properties (not relations — those are already inherited via the API)
      for (const p of parentDef.properties) {
        if (ownNames.has(p.propertyName.toLowerCase())) continue;
        inherited.push({
          name: toCamelCase(p.propertyName),
          type: p.clrType,
          isCollection: false,
        });
      }

      if (inherited.length > 0) {
        inferredProps.set(def.predicatePath, inherited);
        console.log(`  ✓ ${def.name} — +${inherited.length} inherited from ${parentDef.name} (${inherited.map((e) => e.name).join(', ')})`);
      }
    }
  }

  const fs = await import('fs');
  fs.mkdirSync(ENTITIES_DIR, { recursive: true });

  const barrelLines = [
    '// Auto-generated by scripts/generate-entities.mjs — do not edit manually.',
    `// Source: ${ENTITY_DEFS_URL}`,
    `// Generated: ${new Date().toISOString()}`,
    '',
    "import type { EntityInfo } from '../shared/services/aletheia-http-client.models';",
    '',
  ];

  const defByIri = new Map(items.map((d) => [d.iri, d]));
  let count = 0;
  for (const def of items) {
    const content = generateEntityFile(
      def,
      enumValueMap.get(def.predicatePath) ?? null,
      inferredProps.get(def.predicatePath) ?? null,
      defByIri,
    );
    const fileName = `${def.predicatePath}.entity.ts`;
    fs.writeFileSync(`${ENTITIES_DIR}${fileName}`, content, 'utf-8');
    barrelLines.push(`export { ${toPascalCase(def.predicatePath)}Entity, type ${toPascalCase(def.predicatePath)} } from './${def.predicatePath}.entity.js';`);
    count++;
    console.log(`  ✓ ${fileName} (${def.name})`);
  }

  barrelLines.push('');
  fs.writeFileSync(`${ENTITIES_DIR}index.ts`, barrelLines.join('\n'), 'utf-8');
  console.log(`  ✓ index.ts`);
  console.log(`\nGenerated ${count} entity files → ${ENTITIES_DIR}`);
}

main().catch((err) => { console.error('✘ Failed:', err.message); process.exit(1); });
