import type { Arc, Character, Relation } from './types';
import { alabasta } from './arcs/alabasta';
import { dressrosa } from './arcs/dressrosa';
import { eastBlue } from './arcs/east-blue';
import { egghead } from './arcs/egghead';
import { elbaf } from './arcs/elbaf';
import { fishManIsland } from './arcs/fish-man-island';
import { marineford } from './arcs/marineford';
import { punkHazard } from './arcs/punk-hazard';
import { sabaody } from './arcs/sabaody';
import { skypiea } from './arcs/skypiea';
import { thrillerBark } from './arcs/thriller-bark';
import { wano } from './arcs/wano';
import { waterSeven } from './arcs/water-seven';
import { wholeCake } from './arcs/whole-cake';
import { zou } from './arcs/zou';

/** Story order. New arcs get appended here and nowhere else. */
export const ARCS: Arc[] = [
  eastBlue,
  alabasta,
  skypiea,
  waterSeven,
  thrillerBark,
  sabaody,
  marineford,
  fishManIsland,
  punkHazard,
  dressrosa,
  zou,
  wholeCake,
  wano,
  egghead,
  elbaf,
];

export interface CharacterRecord extends Character {
  /** Arc the character first turns up in. */
  arcId: string;
  arcTitle: string;
}

export interface RelationRecord extends Relation {
  /** Arc that revealed the relation, which is rarely the arc of either end. */
  arcId: string;
  arcTitle: string;
}

function collect(): {
  characters: CharacterRecord[];
  relations: RelationRecord[];
} {
  const characters: CharacterRecord[] = [];
  const relations: RelationRecord[] = [];
  const seen = new Set<string>();

  for (const arc of ARCS) {
    for (const character of arc.characters) {
      if (seen.has(character.id)) {
        throw new Error(
          `Duplicate character id "${character.id}" in arc "${arc.id}"`,
        );
      }
      seen.add(character.id);
      characters.push({ ...character, arcId: arc.id, arcTitle: arc.title });
    }
  }

  const pairs = new Set<string>();

  for (const arc of ARCS) {
    for (const relation of arc.relations) {
      const key = `${relation.from}>${relation.to}:${relation.type}`;
      if (pairs.has(key)) {
        throw new Error(
          `Duplicate relation "${key}" repeated in arc "${arc.id}"`,
        );
      }
      pairs.add(key);
      if (!seen.has(relation.from)) {
        throw new Error(
          `Relation in arc "${arc.id}" points from unknown id "${relation.from}"`,
        );
      }
      if (!seen.has(relation.to)) {
        throw new Error(
          `Relation in arc "${arc.id}" points to unknown id "${relation.to}"`,
        );
      }
      if (relation.from === relation.to) {
        throw new Error(
          `Relation in arc "${arc.id}" loops on "${relation.from}"`,
        );
      }
      relations.push({ ...relation, arcId: arc.id, arcTitle: arc.title });
    }
  }

  return { characters, relations };
}

const collected = collect();

export const CHARACTERS: CharacterRecord[] = collected.characters;
export const RELATIONS: RelationRecord[] = collected.relations;
