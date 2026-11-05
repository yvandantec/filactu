// Matrice de traçabilité exigences ↔ tests (STRATEGIE-TESTS.md § 2).
// Échoue si une exigence d'un lot livré n'est couverte par aucun test.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DELIVERED = ['V0.1', 'V0.1.2', 'V0.1.3', 'V0.2', 'V0.3', 'V0.3.1', 'V0.3.2', 'V0.3.4', 'V0.4']; // lots livrés : à compléter à chaque version

const spec = readFileSync('docs/SPECIFICATIONS.md', 'utf8');

// Exigences connues : lignes de tableau « | EXG-001 | texte | »
const reqs = new Map();
for (const m of spec.matchAll(/^\|\s*((?:EXG|ENF)-\d+)\s*\|\s*([^|]+)\|/gm)) reqs.set(m[1], m[2].trim());

// Exigences des lots livrés : « | **V0.1 — …** | … | EXG-001→003, 010 … | »
function expand(list) {
  const out = [];
  for (const raw of list.split(',')) {
    const part = raw.replace(/\(.*?\)/g, '').trim();
    const m = /^(?:(EXG|ENF)-)?(\d+)(?:\s*→\s*(?:(?:EXG|ENF)-)?(\d+))?$/.exec(part);
    if (!m) continue;
    const prefix = m[1] ?? out.at(-1)?.split('-')[0] ?? 'EXG';
    const width = m[2].length;
    const from = Number(m[2]);
    const to = m[3] ? Number(m[3]) : from;
    for (let n = from; n <= to; n++) {
      const id = `${prefix}-${String(n).padStart(width, '0')}`;
      if (reqs.has(id)) out.push(id);
    }
  }
  return out;
}
const delivered = new Set();
for (const m of spec.matchAll(/^\|\s*\*\*(V[\d.]+)[^|]*\|[^|]*\|\s*([^|]+)\|/gm)) {
  if (DELIVERED.includes(m[1])) for (const id of expand(m[2])) delivered.add(id);
}

// Tests : identifiants présents dans les noms de tests
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(test|spec)\.tsx?$/.test(f) ? [p] : [];
  });
}
const coverage = new Map();
for (const file of walk('tests')) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\btest\(\s*['"`]([^'"`]+)['"`]/g)) {
    for (const id of m[1].match(/\b(?:EXG|ENF)-\d+/g) ?? []) {
      if (!coverage.has(id)) coverage.set(id, []);
      coverage.get(id).push(`${file.replace(/\\/g, '/')} › ${m[1]}`);
    }
  }
}

const lines = [
  '# Matrice de traçabilité',
  '',
  `> Générée par \`npm run trace\` — lots livrés : ${DELIVERED.join(', ')}. Ne pas modifier à la main.`,
  '',
  '| Exigence | Lot livré | Tests | Statut |',
  '|---|---|---|---|',
];
const missing = [];
for (const [id, text] of reqs) {
  const tests = coverage.get(id) ?? [];
  const isDelivered = delivered.has(id);
  const status = tests.length ? '✅ couverte' : isDelivered ? '❌ NON COUVERTE' : '— à venir';
  if (isDelivered && !tests.length) missing.push(id);
  lines.push(`| **${id}** ${text.replace(/\*\*/g, '')} | ${isDelivered ? 'oui' : ''} | ${tests.length} | ${status} |`);
}
lines.push('', '## Détail des tests', '');
for (const [id, tests] of [...coverage].sort()) {
  lines.push(`### ${id}`, ...tests.map((t) => `- ${t}`), '');
}
writeFileSync('docs/TRACABILITE.md', lines.join('\n'));

console.log(`Traçabilité : ${delivered.size} exigences livrées, ${delivered.size - missing.length} couvertes.`);
if (missing.length) {
  console.error(`Exigences livrées sans test : ${missing.join(', ')}`);
  process.exit(1);
}
