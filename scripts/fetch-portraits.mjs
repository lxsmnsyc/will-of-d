/**
 * One-off: pull character portraits from the AniList public API, square-crop
 * them to the head, and write them to public/portraits/<id>.webp.
 *
 *   node scripts/fetch-portraits.mjs
 *
 * The artwork stays the copyright of its rights holders; AniList only serves
 * it. Re-run this when characters are added to src/data/arcs/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';

const ANIME_ID = 21; // ONE PIECE
const SIZE = 128;
const OUT_DIR = 'public/portraits';
const MANIFEST = 'src/data/portraits.ts';

/** Names AniList files under a spelling no token match will ever reach. */
const ALIASES = {
  roger: 'Roger Gold',
  bellemere: 'Bellemere',
  koushirou: 'Koshirou',
  koza: 'Kohza',
  noland: 'Norland Montblanc',
  otama: 'Tama',
  hiyori: 'Komurasaki',
  raizo: 'Raizou',
  kanjuro: 'Kanjuurou',
  kinemon: 'Kinemon',
};

const STOP = new Set(['d', 'the', 'of', 'dr', 'professor', 'jr', 'ii', 'iii']);

function tokens(name) {
  return new Set(
    String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      // Collapse the long-vowel romanisations: Kouzuki/Kozuki, Raizou/Raizo.
      .replace(/ou/g, 'o')
      .replace(/uu/g, 'u')
      .replace(/oo/g, 'o')
      .split(/\s+/)
      .filter(token => token.length > 0 && !STOP.has(token)),
  );
}

async function loadCharacters() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  const mod = await server.ssrLoadModule('/src/data/index.ts');
  await server.close();
  return mod.CHARACTERS;
}

const QUERY = `query ($page: Int) {
  Media(id: ${ANIME_ID}, type: ANIME) {
    characters(page: $page, perPage: 25, sort: FAVOURITES_DESC) {
      pageInfo { hasNextPage }
      nodes { id name { full alternative } image { large } }
    }
  }
}`;

async function anilistPage(page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { page } }),
    });
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after') ?? 60) * 1000;
      console.error(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, wait));
      continue;
    }
    if (!response.ok) {
      throw new Error(`AniList ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }
  throw new Error('AniList kept rate limiting; try again later');
}

async function loadAnilistCast() {
  const cast = [];
  for (let page = 1; ; page += 1) {
    const json = await anilistPage(page);
    const block = json.data.Media.characters;
    cast.push(...block.nodes);
    console.error(`  page ${page}: ${cast.length} characters`);
    if (!block.pageInfo.hasNextPage) break;
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  return cast;
}

function namesOf(entry) {
  return [entry.name.full, ...(entry.name.alternative ?? [])].filter(Boolean);
}

/**
 * Score by overlap against the shorter name, so "Garp" matches "Monkey D.
 * Garp" at 1.0 while "Luffy Monkey" only reaches 0.5. An exact token-set hit
 * outranks every partial one, otherwise Brook's "Soul King" alias steals King.
 */
function findMatch(character, cast) {
  const alias = ALIASES[character.id];
  if (alias) {
    const hit = cast.find(entry => namesOf(entry).includes(alias));
    if (hit) return hit;
  }

  const wanted = tokens(character.name);
  let best = null;
  let bestScore = 0;
  let bestShared = 0;

  for (const entry of cast) {
    for (const name of namesOf(entry)) {
      const candidate = tokens(name);
      if (candidate.size === 0) continue;
      let shared = 0;
      for (const token of wanted) if (candidate.has(token)) shared += 1;
      if (shared === 0) continue;
      const exact = shared === wanted.size && shared === candidate.size;
      const score = exact ? 2 : shared / Math.min(wanted.size, candidate.size);
      if (score > bestScore || (score === bestScore && shared > bestShared)) {
        bestScore = score;
        bestShared = shared;
        best = entry;
      }
    }
  }

  return bestScore >= 1 ? best : null;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** AniList art is a tall portrait; the face sits in the upper third. */
async function toAvatar(buffer) {
  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  const side = Math.min(width, height);
  const top = Math.min(Math.round(height * 0.06), Math.max(0, height - side));
  const left = Math.round((width - side) / 2);

  return image
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
}

const characters = await loadCharacters();
console.error(`Matching ${characters.length} characters against AniList…`);
const cast = await loadAnilistCast();

mkdirSync(OUT_DIR, { recursive: true });

const saved = [];
const missing = [];
const fuzzy = [];

for (const character of characters) {
  const match = findMatch(character, cast);
  if (!match) {
    missing.push(character.name);
    continue;
  }
  if (!ALIASES[character.id] && match.name.full !== character.name) {
    fuzzy.push(`${character.name} -> ${match.name.full}`);
  }
  try {
    const avatar = await toAvatar(await download(match.image.large));
    writeFileSync(join(OUT_DIR, `${character.id}.webp`), avatar);
    saved.push(character.id);
  } catch (error) {
    console.error(`  failed ${character.name}: ${error.message}`);
    missing.push(character.name);
  }
  await new Promise(resolve => setTimeout(resolve, 120));
}

saved.sort((a, b) => a.localeCompare(b));
writeFileSync(
  MANIFEST,
  [
    '// Generated by scripts/fetch-portraits.mjs. Do not edit by hand.',
    '',
    '/** Character ids with a file at public/portraits/<id>.webp. */',
    'export const PORTRAIT_IDS: ReadonlySet<string> = new Set([',
    ...saved.map(id => `  '${id}',`),
    ']);',
    '',
  ].join('\n'),
);

console.error(`\nSaved ${saved.length}/${characters.length} portraits.`);
if (fuzzy.length > 0)
  console.error(`\nFuzzy matches:\n  ${fuzzy.join('\n  ')}`);
if (missing.length > 0)
  console.error(`\nNo portrait:\n  ${missing.join('\n  ')}`);
