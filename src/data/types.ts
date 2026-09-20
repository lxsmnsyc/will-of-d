export type RelationType =
  | 'parent'
  | 'adopted'
  | 'sibling'
  | 'romantic'
  | 'taught'
  | 'influenced'
  | 'saved'
  | 'loyalty'
  | 'friend';

/**
 * Within a colour family, the dash pattern separates one type from another and
 * the arrowhead separates a directed relation from a symmetric one: `parent`
 * and `sibling` are both solid, and only `parent` carries an arrow, exactly as
 * `saved` and `friend` do.
 *
 * Relations point from the character who gives to the character who receives.
 * The parent, the adopter, the teacher, the influence and the rescuer are
 * always `from`. Loyalty follows the same rule — the retainer gives it — which
 * is why it is the one type whose rank flows the other way. Romance has no
 * giver, so the authored direction carries no meaning.
 */
export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  note?: string;
}

export interface Character {
  id: string;
  name: string;
  epithet?: string;
  affiliation: string;
}

export interface Arc {
  id: string;
  title: string;
  saga: string;
  characters: Character[];
  relations: Relation[];
}

/** The three colour families the seven relation types are grouped into. */
export type RelationFamily = 'kinship' | 'mentorship' | 'devotion';

export type DashStyle = 'solid' | 'dashed' | 'dotted';

export interface RelationStyle {
  family: RelationFamily;
  /** Wording for `from` acting on `to`: "Shanks influenced Luffy". */
  label: string;
  /** Wording for `to` as the subject: "Luffy was influenced by Shanks". */
  inverseLabel: string;
  dash: DashStyle;
  /** Symmetric relations are drawn without an arrowhead. */
  directed: boolean;
  /**
   * Which end the relation makes more important, and so where PageRank should
   * pool. Mentors and parents earn it; a lord earns the loyalty sworn to them;
   * a partnership credits both.
   */
  credits: 'source' | 'target' | 'both';
}

export const RELATION_STYLES: Record<RelationType, RelationStyle> = {
  parent: {
    family: 'kinship',
    label: 'is parent of',
    inverseLabel: 'is child of',
    dash: 'solid',
    directed: true,
    credits: 'source',
  },
  adopted: {
    family: 'kinship',
    label: 'took in',
    inverseLabel: 'was taken in by',
    dash: 'dashed',
    directed: true,
    credits: 'source',
  },
  sibling: {
    family: 'kinship',
    label: 'is sibling of',
    inverseLabel: 'is sibling of',
    dash: 'solid',
    directed: false,
    credits: 'both',
  },
  romantic: {
    family: 'kinship',
    label: 'is partnered with',
    inverseLabel: 'is partnered with',
    dash: 'dotted',
    directed: false,
    credits: 'both',
  },
  taught: {
    family: 'mentorship',
    label: 'trained',
    inverseLabel: 'was trained by',
    dash: 'solid',
    directed: true,
    credits: 'source',
  },
  influenced: {
    family: 'mentorship',
    label: 'influenced',
    inverseLabel: 'was influenced by',
    dash: 'dashed',
    directed: true,
    credits: 'source',
  },
  saved: {
    family: 'devotion',
    label: 'saved',
    inverseLabel: 'was saved by',
    dash: 'solid',
    directed: true,
    credits: 'source',
  },
  loyalty: {
    family: 'devotion',
    label: 'is sworn to',
    inverseLabel: 'is served by',
    dash: 'dashed',
    directed: true,
    credits: 'target',
  },
  friend: {
    family: 'devotion',
    label: 'is a friend of',
    inverseLabel: 'is a friend of',
    dash: 'solid',
    directed: false,
    credits: 'both',
  },
};

export const RELATION_ORDER: RelationType[] = [
  'parent',
  'adopted',
  'sibling',
  'romantic',
  'taught',
  'influenced',
  'saved',
  'loyalty',
  'friend',
];

export const FAMILY_LABELS: Record<RelationFamily, string> = {
  kinship: 'Kinship',
  mentorship: 'Legacy',
  devotion: 'Devotion',
};
