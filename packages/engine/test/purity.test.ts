import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The engine must be a pure, deterministic simulation. Any wall-clock or
// ambient-randomness API in the engine package breaks replay/resume guarantees.
const BANNED = /Math\.random|Date\.now|performance\.now|new Date\(|setTimeout|setInterval|process\.env/;

const ENGINE_DIR = fileURLToPath(new URL('../src', import.meta.url));

describe('engine purity', () => {
  for (const file of readdirSync(ENGINE_DIR)) {
    if (!file.endsWith('.ts')) continue;
    it(`${file} contains no nondeterministic APIs`, () => {
      const source = readFileSync(join(ENGINE_DIR, file), 'utf8');
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const match = BANNED.exec(code);
      expect(match, `found banned API "${match?.[0]}" in ${file}`).toBeNull();
    });
  }
});
