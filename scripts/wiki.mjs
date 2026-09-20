/**
 * Look things up on the One Piece Fandom wiki while authoring src/data/arcs/.
 *
 *   node scripts/wiki.mjs page "Bartholomew Kuma" mother Teach
 *   node scripts/wiki.mjs category "Whitebeard Pirates Division Commanders"
 *
 * `page` prints the sentences matching any of the trailing keywords, which is
 * how the dataset gets checked against something other than memory. Wiki text
 * is CC BY-SA; the relations here are written from it, not copied.
 */
const API = 'https://onepiece.fandom.com/api.php';
const AGENT = 'will-of-d dataset builder';

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.json();
}

function stripMarkup(text) {
  return text
    .replaceAll(/\{\{Qref\|[^{}]*(\{\{[^{}]*\}\})?[^{}]*\}\}/g, '')
    .replaceAll(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    .replaceAll("'''", '');
}

async function page(title, keywords) {
  const json = await api({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: title,
  });
  const entry = Object.values(json.query.pages)[0];
  if (!entry?.revisions) {
    console.error(`No page called "${title}"`);
    process.exitCode = 1;
    return;
  }

  const text = stripMarkup(entry.revisions[0].slots.main['*']);
  const sentences = text.split(/(?<=\.)\s+/);
  const wanted =
    keywords.length > 0
      ? sentences.filter(sentence =>
          keywords.some(word =>
            sentence.toLowerCase().includes(word.toLowerCase()),
          ),
        )
      : sentences.slice(0, 12);

  for (const sentence of wanted) {
    const line = sentence.trim().replaceAll(/\s+/g, ' ');
    if (line.length > 0 && line.length < 500) console.log(`- ${line}`);
  }
}

async function category(name) {
  const json = await api({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${name}`,
    cmlimit: '500',
    cmnamespace: '0',
  });
  const members = json.query?.categorymembers ?? [];
  console.log(`${members.length} members`);
  for (const member of members) console.log(`- ${member.title}`);
}

const [mode, target, ...rest] = process.argv.slice(2);
if (mode === 'page' && target) await page(target, rest);
else if (mode === 'category' && target) await category(target);
else {
  console.error(
    'usage: wiki.mjs page "<Title>" [keyword...] | category "<Name>"',
  );
  process.exitCode = 1;
}
