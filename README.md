# Will of D.

A single-page graph of who raised, trained, inspired and saved whom across One Piece.

Every relation points from the character who gave to the character who received: the
parent, the adopter, the teacher, the influence and the rescuer are always the source of
the arrow. Loyalty follows the same rule, since the retainer is the one who gives it, and
it is therefore the one type whose importance flows to the target rather than the source.
Partnership, siblinghood and friendship are symmetric, so they are drawn without an
arrowhead and the authored direction means nothing.

The nine types are grouped into three colour families: kinship, legacy and devotion.
Inside a family the dash pattern separates one type from another and the arrowhead
separates a directed relation from a symmetric one, so `parent` and `sibling` are both
solid and only `parent` carries an arrow, exactly as `saved` and `friend` do. Identity
never rests on colour alone. Only
three hues clear the colour-blindness and contrast gates for a graph, where any two marks
can end up adjacent; a fourth fails in dark mode, which is why line style carries the rest
of the load.

Node size blends connection count with PageRank, both on a log scale and then mixed with
each node's rank among the cast so the sizes spread rather than collapsing next to Luffy.
Connection count leads at about three to one: on a graph this sparse, PageRank hands a
huge score to anyone sitting upstream of one busy character, which would draw Ace's mother
the size of a Yonko.

## Running it

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # static site in dist/
pnpm preview
```

`pnpm lint`, `pnpm format` and `pnpm type-check` cover oxlint, oxfmt and tsgo.

## Deploying

The site is static, so Cloudflare Pages serves `dist/` as it is built. `wrangler.jsonc`
names the same folder for the command line.

Connect the repository to a Pages project and use these settings:

- Build command: `pnpm build`
- Output directory: `dist`
- Node version: read from `.node-version`, currently 22.16.0

To upload a build from your machine instead:

```sh
pnpm run deploy:pages
```

`public/_headers` sets the cache policy and the response headers. Fingerprinted assets and
portraits are held for a year, and `index.html` is never held. Every response carries a
content security policy that allows this origin plus the two Cloudflare Web Analytics
hosts. Any other host you load from has to be added there first.

There are no client-side routes, so the project needs no `_redirects` file. Adding a
catch-all rewrite would turn a missing portrait into a 200 that returns the page.

Turn on Web Analytics from the Pages project and Cloudflare adds the beacon on the next
deployment. It counts visits, referrers, countries and devices. It cannot tell you which
characters people click, because the graph never changes the URL, so measuring that needs
a tool with custom events such as Umami or Plausible.

## Portraits

`public/portraits/<id>.webp` holds a 128px square crop per character, re-encoded with
sharp. 688 of 757 characters have one, about 4 MB in total. Two public APIs supply them,
in this order:

```sh
node scripts/fetch-portraits.mjs      # AniList
node scripts/fetch-portraits-mal.mjs  # MyAnimeList, for whoever AniList has no face for
```

AniList lists the cast the anime gave a credit to. That covers most of the named
characters and few of the minor ones. MyAnimeList lists about three times as many and
fills the rest.

Both scripts skip anyone who already has a file. AniList's art therefore wins where both
have one, and a run after adding an arc costs only the new names. Pass ids to either
script to refetch and overwrite just those.

The One Piece wiki has a picture for nearly everyone still missing. Its image host answers
scripts with a Cloudflare challenge, so those 69 keep their monogram.

Both scripts rewrite `src/data/portraits.ts` from the folder itself. It holds every id
that has a file and the hash of that file's bytes, so the canvas never requests a portrait
that does not exist. Anyone without one falls back to a monogram, on the canvas and in the
panel, so a missing face costs nothing.

The page appends the hash to the request: `portraits/luffy.webp?v=1a2b3c4d`. Caches key on
the query as well as the path. The folder can therefore be served `immutable` for a year
(see `public/_headers`), and a replaced portrait still arrives at once under a URL nobody
has cached.

The artwork stays the copyright of its rights holders. AniList and MyAnimeList only host
it. This is a non-commercial fan visualisation. Swap the images or drop the folder if that
does not suit your use.

## Where the data comes from

The relations are written by hand, arc by arc. There is no feed to import: no source
publishes "influenced by" or "saved by" as structured data, and the One Piece Fandom wiki
keeps family and crew ties in prose rather than in its infoboxes.

What the wiki is good for is checking the writing, so `scripts/wiki.mjs` fetches a page and
prints the sentences matching a keyword:

```sh
node scripts/wiki.mjs page "Bartholomew Kuma" mother Teach
node scripts/wiki.mjs category "Whitebeard Pirates Division Commanders"
```

Check anything uncertain against it before adding it, particularly recent chapters. Wiki
text is CC BY-SA; the entries here are written from it rather than copied.

## Adding characters

The dataset lives in `src/data/arcs/`, one file per arc, in story order. A character is
declared in the arc it first appears in; a relation is declared in the arc that revealed
it, which is often neither end's debut arc. `src/data/index.ts` merges the arcs and throws
on duplicate ids, unknown endpoints and self-loops, so a typo fails at startup rather than
rendering a silently wrong graph.

To extend the graph, add an arc file, export it, and append it to `ARCS` in
`src/data/index.ts`. Nothing else needs to change.

[CONTRIBUTING.md](CONTRIBUTING.md) has the rest. It covers which sources count, what
makes a relation, where an entry belongs, and how to check it.
