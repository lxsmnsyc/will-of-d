/**
 * Matching a dataset name to a name in somebody else's cast list.
 *
 * Shared by the AniList and MyAnimeList fetchers. The two sources disagree
 * about romanisation and word order, but not about who anyone is.
 */

const STOP = new Set(['d', 'the', 'of', 'dr', 'professor', 'jr', 'ii', 'iii']);

export function tokens(name) {
  return new Set(
    String(name)
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[̀-ͯ]/g, '')
      .replaceAll(/[^a-z0-9\s]/g, ' ')
      // Collapse the long-vowel romanisations, such as Kouzuki and Kozuki.
      .replaceAll('ou', 'o')
      .replaceAll('uu', 'u')
      .replaceAll('oo', 'o')
      .split(/\s+/)
      .filter(token => token.length > 0 && !STOP.has(token)),
  );
}

/**
 * Score by overlap against the shorter name. "Garp" matches "Monkey D. Garp"
 * at 1.0, while "Luffy Monkey" only reaches 0.5. An exact token-set hit
 * outranks every partial one. Without that, Brook's "Soul King" alias steals
 * King.
 *
 * `namesOf` yields every spelling an entry answers to.
 */
export function findMatch(name, cast, namesOf) {
  const wanted = tokens(name);
  let best = null;
  let bestScore = 0;
  let bestShared = 0;

  for (const entry of cast) {
    for (const candidateName of namesOf(entry)) {
      const candidate = tokens(candidateName);
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
