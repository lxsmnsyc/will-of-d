import type { Arc } from '../types';

export const thrillerBark: Arc = {
  id: 'thriller-bark',
  title: 'Thriller Bark',
  saga: 'Thriller Bark',
  characters: [
    {
      id: 'brook',
      name: 'Brook',
      epithet: 'Soul King',
      affiliation: 'Straw Hat Pirates',
    },
    { id: 'yorki', name: 'Calico Yorki', affiliation: 'Rumbar Pirates' },
    {
      id: 'ryuma',
      name: 'Ryuma',
      epithet: 'the Sword God',
      affiliation: 'Wano Country',
    },
    { id: 'moria', name: 'Gecko Moria', affiliation: 'Thriller Bark' },
    {
      id: 'perona',
      name: 'Perona',
      epithet: 'Ghost Princess',
      affiliation: 'Thriller Bark',
    },
    {
      id: 'kuma',
      name: 'Bartholomew Kuma',
      epithet: 'the Tyrant',
      affiliation: 'Revolutionary Army',
    },
  ],
  relations: [
    { from: 'yorki', to: 'brook', type: 'influenced' },
    {
      from: 'brook',
      to: 'laboon',
      type: 'influenced',
      note: 'A promise kept for fifty years',
    },
    { from: 'ryuma', to: 'zoro', type: 'influenced', note: 'Left him Shusui' },
    {
      from: 'zoro',
      to: 'luffy',
      type: 'saved',
      note: 'Took all of his pain from Kuma',
    },
    { from: 'moria', to: 'perona', type: 'influenced' },
    { from: 'brook', to: 'luffy', type: 'loyalty' },
    { from: 'brook', to: 'yorki', type: 'loyalty' },
    { from: 'perona', to: 'moria', type: 'loyalty' },
  ],
};
