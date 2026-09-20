import type { Arc } from '../types';

export const egghead: Arc = {
  id: 'egghead',
  title: 'Egghead',
  saga: 'Final Saga',
  characters: [
    { id: 'vegapunk', name: 'Dr. Vegapunk', affiliation: 'Egghead' },
    { id: 'ginny', name: 'Ginny', affiliation: 'Revolutionary Army' },
    { id: 'clapp', name: 'Clapp', affiliation: 'Sorbet Kingdom' },
  ],
  relations: [
    {
      from: 'kuma',
      to: 'bonney',
      type: 'adopted',
      note: 'Found her beside Ginny\u2019s body and raised her as his own',
    },
    { from: 'ginny', to: 'bonney', type: 'parent' },
    {
      from: 'kuma',
      to: 'bonney',
      type: 'saved',
      note: 'Sold his body piece by piece to buy her cure',
    },
    { from: 'kuma', to: 'ginny', type: 'influenced' },
    { from: 'dragon', to: 'ginny', type: 'influenced' },
    { from: 'ivankov', to: 'kuma', type: 'influenced' },
    {
      from: 'vegapunk',
      to: 'saul',
      type: 'saved',
      note: 'Kept a dead giant alive on Egghead',
    },
    { from: 'vegapunk', to: 'franky', type: 'influenced' },
    { from: 'vegapunk', to: 'kuma', type: 'influenced' },
    { from: 'clover', to: 'vegapunk', type: 'influenced' },
    {
      from: 'saul',
      to: 'robin',
      type: 'influenced',
      note: 'Reunited on Egghead',
    },
    { from: 'bonney', to: 'luffy', type: 'influenced' },
    {
      from: 'kuma',
      to: 'ginny',
      type: 'romantic',
      note: 'Mutual, but he refused her proposal',
    },
    { from: 'ginny', to: 'dragon', type: 'loyalty' },
    {
      from: 'vegapunk',
      to: 'kizaru',
      type: 'influenced',
      note: 'Friends since long before either had a title',
    },
    {
      from: 'kuma',
      to: 'teach',
      type: 'saved',
      note: 'Unknowingly, freeing him and his mother from slavery at God Valley (ch. 1164)',
    },
    {
      from: 'clapp',
      to: 'kuma',
      type: 'influenced',
      note: 'Told a child slave about the Warrior Nika',
    },
  ],
};
