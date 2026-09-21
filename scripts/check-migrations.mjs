import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Checks that the migrations, applied in order, never reference a function,
 * table or type before it is created.
 *
 * Postgres resolves a policy's expression when the policy is created, so a
 * policy that calls a function defined further down fails with
 * "42883: function does not exist" — which is easy to introduce by inserting
 * a block in the wrong place, and invisible until someone runs the schema.
 */
const DIR = process.argv[2] ?? 'supabase/migrations';
const files = readdirSync(DIR).filter((name) => name.endsWith('.sql')).sort();

/** Every line of every migration, in application order. */
const lines = [];
for (const file of files) {
  readFileSync(join(DIR, file), 'utf8').split('\n').forEach((text, index) => {
    // Comments cannot reference anything.
    lines.push({ file, line: index + 1, text: text.replace(/--.*$/, '') });
  });
}

const defined = new Map(); // name -> index of the line that creates it

lines.forEach((entry, index) => {
  const patterns = [
    /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)/i,
    /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/i,
    /create\s+type\s+public\.(\w+)/i,
  ];
  for (const pattern of patterns) {
    const match = entry.text.match(pattern);
    if (match && !defined.has(match[1])) defined.set(match[1], index);
  }
});

const problems = [];

lines.forEach((entry, index) => {
  // Skip the definition lines themselves.
  if (/create\s+(?:or\s+replace\s+)?function|create\s+table|create\s+type/i.test(entry.text)) {
    // A create table can still reference a type or another table.
    if (/create\s+(?:or\s+replace\s+)?function/i.test(entry.text)) return;
  }

  for (const match of entry.text.matchAll(/public\.(\w+)/g)) {
    const name = match[1];
    const definedAt = defined.get(name);

    if (definedAt === undefined) {
      problems.push(`${entry.file}:${entry.line}: references public.${name}, which no migration creates`);
    } else if (definedAt > index) {
      problems.push(
        `${entry.file}:${entry.line}: uses public.${name} before ${lines[definedAt].file}:${lines[definedAt].line} creates it`
      );
    }
  }
});

console.log(`Checked ${files.length} migrations, ${lines.length} lines, ${defined.size} objects.`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(' -', problem);
  process.exit(1);
}

console.log('No forward references.');
