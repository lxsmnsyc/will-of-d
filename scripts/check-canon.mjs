/**
 * Flags characters in src/data/arcs/ that fall outside the dataset's sources.
 *
 *   node scripts/check-canon.mjs
 *
 * A character qualifies if they appear in, or are mentioned in, the manga, a
 * Vivre Card databook or one of Oda's SBS columns. The One Piece Fandom wiki's
 * `first` infobox field records which one. A debut naming only an episode, a
 * film or a light novel means the character does not belong here.
 */
import { createServer } from 'vite';

const API = 'https://onepiece.fandom.com/api.php';
const AGENT = 'will-of-d canon check';

async function wikitext(title) {
  const url = `${API}?${new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: title,
    redirects: '1',
    format: 'json',
  })}`;
  const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
  if (!response.ok) throw new Error(`${response.status} for ${title}`);
  const json = await response.json();
  const entry = Object.values(json.query.pages)[0];
  return entry?.revisions?.[0]?.slots?.main?.['*'] ?? null;
}

function debutOf(text) {
  const match = /\|\s*first\s*=\s*([^\n|]*)/.exec(text);
  if (!match) return null;
  return match[1].replaceAll(/\{\{[^{}]*\}\}/g, '').trim();
}

const ADMITTED = /chapter|vivre\s*card|\bsbs\b/i;

/** True when the debut cites the manga, a Vivre Card or an SBS. */
function isAdmitted(debut) {
  return ADMITTED.test(debut);
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { CHARACTERS } = await server.ssrLoadModule('/src/data/index.ts');
await server.close();

const suspect = [];
const unverified = [];

for (const character of CHARACTERS) {
  let debut = null;
  try {
    const text = await wikitext(character.name);
    debut = text ? debutOf(text) : null;
    if (!debut) {
      // Major characters keep their infobox on a tab template instead.
      const tabs = await wikitext(`Template:${character.name} Tabs Top`);
      debut = tabs ? debutOf(tabs) : null;
    }
  } catch (error) {
    console.error(`  ${character.name}: ${error.message}`);
  }

  if (!debut) unverified.push(character.name);
  else if (!/chapter/i.test(debut)) suspect.push(`${character.name}: ${debut}`);

  await new Promise(resolve => setTimeout(resolve, 120));
}

console.log(`\nChecked ${CHARACTERS.length} characters.`);
console.log(`\nOUTSIDE THE ADMITTED SOURCES (${suspect.length}):`);
for (const line of suspect) console.log(`  ${line}`);
console.log(`\nCould not verify (${unverified.length}):`);
console.log(`  ${unverified.join(', ')}`);
