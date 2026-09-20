/**
 * Fills the portraits AniList has no face for, from MyAnimeList via Jikan.
 *
 *   node scripts/fetch-portraits-mal.mjs            # every character with no file
 *   node scripts/fetch-portraits-mal.mjs shanks     # just these ids, overwriting
 *
 * AniList lists the cast the anime gave a credit to. That leaves half the
 * minor characters here faceless. MyAnimeList carries about three times as
 * many.
 *
 * The One Piece wiki has a picture for nearly everyone else. Its image host
 * answers scripts with a Cloudflare challenge, so those characters stay blank
 * instead of the challenge being worked around.
 *
 * Without arguments this only fetches characters with no file on disk.
 * AniList's art therefore wins where both sources have one, and a re-run after
 * adding an arc costs only the new names. Named ids are refetched and
 * overwritten.
 *
 * The artwork stays the copyright of its rights holders. MyAnimeList only
 * serves it. Re-run this when characters are added to src/data/arcs/.
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { createServer } from 'vite';
import { findMatch } from './match-names.mjs';
import {
  stampFor,
  writeManifest,
  writePortrait,
} from './portraits-manifest.mjs';

const CAST = 'https://api.jikan.moe/v4/anime/21/characters'; // ONE PIECE
const SIZE = 128;
const OUT_DIR = 'public/portraits';

/** Names MyAnimeList files under a spelling no token match will ever reach. */
const ALIASES = {
  'mr-13': 'Mr. 13',
};

/**
 * A partial name match is worth less than a blank node. Skip the ids that land
 * on a stranger.
 *
 * MyAnimeList's "Gram" is not Marco's father. His wiki page carries a
 * disambiguation notice for that name. Its "Macro" is the fish-man, not the
 * automaton who shares the name.
 */
const NO_MATCH = new Set(['gram', 'colonel-macro']);

async function loadCharacters() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  const data = await server.ssrLoadModule('/src/data/index.ts');
  await server.close();
  return data.CHARACTERS;
}

async function loadCast() {
  const response = await fetch(CAST);
  if (!response.ok) {
    throw new Error(`Jikan ${response.status}: ${await response.text()}`);
  }
  const json = await response.json();
  return (
    json.data
      .map(entry => ({
        name: entry.character.name,
        image: entry.character.images.jpg.image_url,
      }))
      // MyAnimeList stands a question mark in for the art it does not have.
      .filter(entry => !entry.image.includes('questionmark'))
  );
}

/** MyAnimeList files people surname-first: "Mizuta, Madaisuki". */
function namesOf(entry) {
  const parts = entry.name.split(', ');
  if (parts.length === 1) return [entry.name];
  return [entry.name, parts.toReversed().join(' ')];
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** MyAnimeList art is a tall portrait; the face sits in the upper third. */
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

const only = new Set(process.argv.slice(2));
const characters = (await loadCharacters()).filter(character =>
  only.size > 0 ? only.has(character.id) : stampFor(character.id) === null,
);

if (characters.length === 0) {
  console.error(`Nothing to fetch. Manifest: ${writeManifest()}.`);
  process.exit(0);
}

const cast = await loadCast();
console.error(
  `Matching ${characters.length} characters against ${cast.length} on MyAnimeList…`,
);

mkdirSync(OUT_DIR, { recursive: true });

const saved = [];
const missing = [];
const fuzzy = [];

for (const character of characters) {
  if (NO_MATCH.has(character.id)) {
    missing.push(character.name);
    continue;
  }
  const alias = ALIASES[character.id];
  const match = alias
    ? cast.find(entry => namesOf(entry).includes(alias))
    : findMatch(character.name, cast, namesOf);
  if (!match) {
    missing.push(character.name);
    continue;
  }
  if (!alias && !namesOf(match).includes(character.name)) {
    fuzzy.push(`${character.name} -> ${match.name}`);
  }
  try {
    writePortrait(character.id, await toAvatar(await download(match.image)));
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
