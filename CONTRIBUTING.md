# Adding and updating a character

The graph records how One Piece characters shaped one another. Every entry is
written by hand from a source. Read these rules before your first entry.

## Which sources count

Three sources count:

- The manga.
- The Vivre Card databooks.
- Oda's SBS columns.

Cover stories count as manga. Enel's trip to the moon and the Straw Hats'
separation serial are as admissible as any chapter.

Anime-original and film characters stay out. Byrnndi World comes from the 3D2Y
special. Caroline comes from the anime.

Check the wiki's `first` field instead of assuming. A character can be known for
a film and still have a manga panel. Uta debuts in Chapter 1055.

Some characters appear in the manga under a name the anime invented. The wiki
marks these with a `{{Non-Canon Name}}` template. Kitton, Pekkori and Taroimo
are examples. No entry in the dataset carries that template today. Raise it in
an issue if you think one belongs.

## Which relations count

The graph records bonds, not conflict. There is no antagonist or rivalry type,
and one will not be added.

The test is whether something passed from one character to the other. It counts
even when what passed down is ugly:

- Arlong filled Hody Jones's childhood with tales of fish-man supremacy.
- Trebol gave a ten-year-old Doflamingo a Devil Fruit and the idea that he was a
  god.

Leave the pair unconnected when the only link is harm done to one of them:

- Alvida kept Koby in servitude.
- Teach murdered Thatch.
- Sancrin kidnapped Brook to exhibit him.

Leaving out a relation is not a reason to leave out the character. Alvida was
once missing from the dataset because her only link to Koby was harm. She
belongs. The edge does not.

Notes follow the same rule. Record crew membership even where the character
later betrayed the crew. Do not write the note to foreground the betrayal.

## The nine relation types

A relation points from the character who gives to the character who receives.
The parent, the adopter, the teacher, the influence and the rescuer are always
`from`.

| Type         | Reads as          | Direction         |
| ------------ | ----------------- | ----------------- |
| `parent`     | is parent of      | giver to receiver |
| `adopted`    | took in           | giver to receiver |
| `sibling`    | is sibling of     | symmetric         |
| `romantic`   | is partnered with | symmetric         |
| `taught`     | trained           | giver to receiver |
| `influenced` | influenced        | giver to receiver |
| `saved`      | saved             | giver to receiver |
| `loyalty`    | is sworn to       | retainer to lord  |
| `friend`     | is a friend of    | symmetric         |

`loyalty` runs the other way from the rest. The retainer gives it, so the edge
points at the person it makes important.

The direction of the three symmetric types carries no meaning. Pick either.

A created being is `loyalty` to whoever made it. Big Mom's homies and Dr.
Tsukimi's automata both work this way.

## Where an entry goes

`src/data/arcs/` holds one file per arc, in story order.

- Declare a character in the arc they first appear in, by debut chapter. Do not
  use the arc you were reading about them in. About 100 entries once sat in the
  wrong file for that reason. Charlos was filed under Reverie though he appears
  hundreds of chapters earlier.
- Declare a relation in the arc that revealed it. That is often neither end's
  debut arc.

```ts
{
  id: 'shanba',
  name: 'Shanba',
  affiliation: 'Torino Kingdom',
  debut: 'Chapter 524',
},
```

`id` is kebab-case and globally unique. Watch for two characters who share a
name. The fish-man Macro is `macro`, so the automaton is `colonel-macro`.

`debut` is the chapter from the wiki infobox's `first` field. Use an SBS volume
for the few characters Oda only answered a question about. Leave the field off
when there is no chapter at all.

`src/data/index.ts` merges the arcs. It throws on duplicate ids, unknown
relation endpoints, self-loops, and repeated `(from, to, type)` triples. A typo
fails at startup instead of rendering a wrong graph.

## Checking against the wiki

`scripts/wiki.mjs` prints the sentences of a page that match your keywords:

```sh
node scripts/wiki.mjs page "Bartholomew Kuma" mother Teach
node scripts/wiki.mjs category "Whitebeard Pirates Division Commanders"
```

Three things catch people out:

- Read the page before deciding there is no bond. Emet was left out as having no
  bond to source. The page opens by calling the robot a friend of Joy Boy. An
  exclusion needs the same evidence as an inclusion.
- Major characters keep their relationships on a subpage. Twelve of them have a
  `<Name>/Personality and Relationships` page, and the main page says little.
  Doflamingo's tie to Kaido lives there and was missed for months.
- Wiki fields hide behind piped links. A regex that stops at the first `|` will
  miss `first = [[Chapter 450|Chapter 450]]`.

Wiki text is CC BY-SA. Write entries from it. Do not copy sentences into notes.

## Portraits

Fetch faces after adding characters:

```sh
node scripts/fetch-portraits.mjs      # AniList
node scripts/fetch-portraits-mal.mjs  # MyAnimeList, for whoever AniList missed
```

Both scripts skip anyone who already has a file, so a run costs only the new
names. Pass ids to refetch and overwrite specific characters.

Look at the faces you got. Name matching fails in one specific way. It lands on
a different character with the same name. Shepherd Sommers once got the face of
a filler-arc marine. Polo Gram got a woman in a headscarf. Colonel Macro got the
fish-man. Add the id to the `NO_MATCH` set at the top of the script that made
the mistake. Deleting the file alone does not work, because the next run puts it
back.

## Before opening a pull request

Run these:

```sh
pnpm type-check
pnpm lint
pnpm format
pnpm build
```

The dataset validator runs inside any command that loads the data. A green build
means the ids line up.

Say where each fact came from in the pull request. Give the chapter, the Vivre
Card, or the SBS volume. An entry nobody can check is an entry nobody can keep.

## Scope

The dataset grows one arc at a time. A pull request that adds one arc is easy to
check. A pull request that sweeps the whole dataset will be asked to be split.

## Writing style

Prose that ships with the code follows the same rules. This covers code
comments, commit messages, pull request descriptions, and these docs:

- Keep sentences short and direct.
- Use no em-dashes or en-dashes. End the sentence and start a new one.
- Write multiple points as a list, one idea per sentence.
- Say what the change does and why. Skip how you got there.
