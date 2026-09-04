#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const ignored = new Set(['.git', 'node_modules', '.vercel', '.temp', 'dist', 'build']);
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.html', '.sql', '.json']);
const findings = [];

const rules = [
  { severity: 'CRITICAL', id: 'SERVICE_ROLE_FRONTEND', regex: /(?:service[_-]?role|SUPABASE_SERVICE_ROLE_KEY)/i, onlyFrontend: true },
  { severity: 'CRITICAL', id: 'PRIVATE_KEY', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { severity: 'HIGH', id: 'EVAL', regex: /\beval\s*\(/ },
  { severity: 'HIGH', id: 'NEW_FUNCTION', regex: /new\s+Function\s*\(/ },
  { severity: 'HIGH', id: 'DOCUMENT_WRITE', regex: /document\.write\s*\(/ },
  { severity: 'HIGH', id: 'DANGEROUS_PROTOCOL', regex: /(?:href|src)\s*=\s*[`'"]\s*(?:javascript|vbscript):/i },
  { severity: 'MEDIUM', id: 'INSERT_ADJACENT_HTML', regex: /insertAdjacentHTML\s*\(/ },
  { severity: 'MEDIUM', id: 'OUTER_HTML', regex: /\.outerHTML\s*=/ },
  { severity: 'REVIEW', id: 'INNER_HTML', regex: /\.innerHTML\s*=/ },
  { severity: 'REVIEW', id: 'LOCALSTORAGE_TOKEN', regex: /localStorage\.(?:setItem|getItem)\s*\([^\n]*(?:token|secret|jwt|session)/i }
];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) await inspect(full);
  }
}

async function inspect(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const text = await readFile(file, 'utf8').catch(() => '');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.onlyFrontend && !relative.includes('frontend')) continue;
      if (rule.regex.test(line)) findings.push({ ...rule, file: relative, line: index + 1, sample: line.trim().slice(0, 180) });
      rule.regex.lastIndex = 0;
    }
  });
}

await walk(root);
const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, REVIEW: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);

for (const item of findings) console.log(`[${item.severity}] ${item.id} ${item.file}:${item.line}\n  ${item.sample}`);
const blocking = findings.filter(item => ['CRITICAL', 'HIGH'].includes(item.severity));
console.log(`\nResumen: ${findings.length} hallazgos; ${blocking.length} bloqueantes.`);
process.exitCode = blocking.length ? 1 : 0;
