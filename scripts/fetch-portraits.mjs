/**
 * One-off: pull character portraits from the AniList public API, square-crop
 * them to the head, and write them to public/portraits/<id>.webp.
 *
 *   node scripts/fetch-portraits.mjs            # every character with no file
 *   node scripts/fetch-portraits.mjs shanks      # just these ids, overwriting
 *
 * This is the first of the two sources; scripts/fetch-portraits-mal.mjs fills
 * in whoever AniList has no face for.
 *
 * The artwork stays the copyright of its rights holders. AniList only serves
 * it. Re-run this when characters are added to src/data/arcs/.
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { createServer } from 'vite';
import { findMatch as bestOf } from './match-names.mjs';
import {
  stampFor,
  writeManifest,
  writePortrait,
} from './portraits-manifest.mjs';

const ANIME_ID = 21; // ONE PIECE
const SIZE = 128;
const OUT_DIR = 'public/portraits';

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

/**
 * AniList's One Piece cast mixes in anime-only characters, and a few of them
 * carry a canon character's name. Skip the match rather than take the wrong
 * face. Shepherd Sommers was landing on a G-5 marine from a filler arc.
 * Colonel Macro the automaton was landing on Macro the fish-man.
 */
const NO_MATCH = new Set(['sommers', 'colonel-macro']);

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

function findMatch(character, cast) {
  if (NO_MATCH.has(character.id)) return null;

  const alias = ALIASES[character.id];
  if (alias) {
    const hit = cast.find(entry => namesOf(entry).includes(alias));
    if (hit) return hit;
  }

  return bestOf(character.name, cast, namesOf);
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

// Named ids are refetched and overwritten; otherwise this fills the blanks,
// which keeps a run after a new arc cheap and leaves MyAnimeList's work alone.
const only = new Set(process.argv.slice(2));
const characters = (await loadCharacters()).filter(character =>
  only.size > 0 ? only.has(character.id) : stampFor(character.id) === null,
);
if (characters.length === 0) {
  console.error(`Nothing to fetch. Manifest: ${writeManifest()}.`);
  process.exit(0);
}

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
    writePortrait(
      character.id,
      await toAvatar(await download(match.image.large)),
    );
    saved.push(character.id);
  } catch (error) {
    console.error(`  failed ${character.name}: ${error.message}`);
    missing.push(character.name);
  }
  await new Promise(resolve => setTimeout(resolve, 120));
}

const total = writeManifest();

console.error(
  `\nSaved ${saved.length}/${characters.length}. Manifest: ${total}.`,
);
if (fuzzy.length > 0)
  console.error(`\nFuzzy matches:\n  ${fuzzy.join('\n  ')}`);
if (missing.length > 0)
  console.error(`\nNo portrait:\n  ${missing.join('\n  ')}`);
