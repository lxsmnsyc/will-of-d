import type { Arc } from '../types';

export const skypiea: Arc = {
  id: 'skypiea',
  title: 'Jaya & Skypiea',
  saga: 'Sky Island',
  characters: [
    {
      id: 'cricket',
      name: 'Montblanc Cricket',
      affiliation: 'Saruyama Alliance',
    },
    { id: 'noland', name: 'Montblanc Noland', affiliation: 'North Blue' },
    { id: 'kalgara', name: 'Kalgara', affiliation: 'Shandia' },
    { id: 'wiper', name: 'Wiper', affiliation: 'Shandia' },
    {
      id: 'gan-fall',
      name: 'Gan Fall',
      epithet: 'Sky Knight',
      affiliation: 'Skypiea',
    },
    { id: 'conis', name: 'Conis', affiliation: 'Skypiea' },
    { id: 'pagaya', name: 'Pagaya', affiliation: 'Skypiea' },
    {
      id: 'bellamy',
      name: 'Bellamy',
      epithet: 'the Hyena',
      affiliation: 'Bellamy Pirates',
    },
    {
      id: 'teach',
      name: 'Marshall D. Teach',
      epithet: 'Blackbeard',
      affiliation: 'Blackbeard Pirates',
    },
  ],
  relations: [
    { from: 'noland', to: 'cricket', type: 'parent', note: 'Ancestor' },
    { from: 'noland', to: 'kalgara', type: 'influenced' },
    { from: 'kalgara', to: 'wiper', type: 'parent', note: 'Ancestor' },
    {
      from: 'cricket',
      to: 'luffy',
      type: 'influenced',
      note: 'Pointed the crew at the sky',
    },
    {
      from: 'gan-fall',
      to: 'luffy',
      type: 'saved',
      note: 'Treated the crew after Enel',
    },
    { from: 'pagaya', to: 'conis', type: 'parent' },
    { from: 'gan-fall', to: 'conis', type: 'influenced' },
    {
      from: 'noland',
      to: 'kalgara',
      type: 'saved',
      note: 'Cured the tree fever the Shandia were dying of',
    },
  ],
};
