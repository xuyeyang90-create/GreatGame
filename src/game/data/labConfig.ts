export const STAT_KEYS = [
  'appearance',
  'figure',
  'aura',
  'gentleness',
  'eloquence',
  'stability',
  'constitution'
] as const;

export const BREEDING_GENE_KEYS = ['FEC', 'GES', 'HER', 'VAR', 'MND'] as const;

export const DEFECT_KEYS = [
  'frail',
  'cold',
  'subfertile',
  'unstable',
  'taciturn',
  'fragileAttachment'
] as const;

export const LIFE_STAGES = [
  'infant',
  'growth',
  'mature',
  'prime',
  'declining',
  'aging'
] as const;

export const TRAIT_STAGES = ['innate', 'growth'] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type BreedingGeneKey = (typeof BREEDING_GENE_KEYS)[number];
export type DefectKey = (typeof DEFECT_KEYS)[number];
export type LifeStage = (typeof LIFE_STAGES)[number];
export type TraitStage = (typeof TRAIT_STAGES)[number];
export type Sex = '女' | '男';
export type GeneAllele = 'S' | 'A' | 'N' | 'B' | 'C';
export type DefectAllele = 'R' | 'r';
export type GenePair = [GeneAllele, GeneAllele];
export type DefectPair = [DefectAllele, DefectAllele];
export type VisibleGenome = Record<StatKey, [GenePair, GenePair, GenePair, GenePair]>;
export type BreedingGenome = Record<BreedingGeneKey, GenePair>;
export type DefectGenome = Record<DefectKey, DefectPair>;

export type TraitDefinition = {
  id: string;
  name: string;
  stage: TraitStage;
  description: string;
  statMods?: Partial<Record<StatKey, number>>;
  healthDelta?: number;
  lifespanDelta?: number;
  loyaltyDrainMod?: number;
  missionRiskMod?: number;
  bloodlineValueMod?: number;
  fertilityMod?: number;
};

export const STAT_LABELS: Record<StatKey, string> = {
  appearance: '容貌',
  figure: '身姿',
  aura: '气质',
  gentleness: '温柔',
  eloquence: '健谈',
  stability: '稳定',
  constitution: '体质'
};

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  infant: '幼体',
  growth: '成长期',
  mature: '成熟',
  prime: '盛期',
  declining: '衰退',
  aging: '老化'
};

export const BREEDING_GENE_LABELS: Record<BreedingGeneKey, string> = {
  FEC: '繁殖力',
  GES: '妊娠稳定',
  HER: '血系固化',
  VAR: '波动性',
  MND: '心智倾向'
};

export const DEFECT_LABELS: Record<DefectKey, string> = {
  frail: '体弱',
  cold: '冷淡',
  subfertile: '亚生育',
  unstable: '不稳',
  taciturn: '寡言',
  fragileAttachment: '依附脆弱'
};

export const STAT_COLORS: Record<StatKey, string> = {
  appearance: '#7dd3fc',
  figure: '#93c5fd',
  aura: '#60a5fa',
  gentleness: '#f9a8d4',
  eloquence: '#c4b5fd',
  stability: '#86efac',
  constitution: '#fcd34d'
};

export const ALLELE_VALUES: Record<GeneAllele, number> = {
  S: 2,
  A: 1,
  N: 0,
  B: -1,
  C: -2
};

export const INNATE_TRAITS: TraitDefinition[] = [
  {
    id: 'photogenic',
    name: '镜头感',
    stage: 'innate',
    description: '高容貌会自然转化成更强的整体呈现力。',
    statMods: { aura: 6 },
    missionRiskMod: -4,
    bloodlineValueMod: 6
  },
  {
    id: 'talkative',
    name: '善谈',
    stage: 'innate',
    description: '表达能力强，也更容易让互动保持柔和顺畅。',
    statMods: { gentleness: 4, stability: 3 },
    missionRiskMod: -5
  },
  {
    id: 'calmingPresence',
    name: '安抚气场',
    stage: 'innate',
    description: '温柔优势会延伸成更稳定的控场气场。',
    statMods: { stability: 6 },
    missionRiskMod: -4
  },
  {
    id: 'emotionallyStable',
    name: '情绪稳态',
    stage: 'innate',
    description: '稳定的人也更容易给目标安全感。',
    statMods: { gentleness: 5 },
    loyaltyDrainMod: -1,
    missionRiskMod: -4
  },
  {
    id: 'pressureResistant',
    name: '耐压体',
    stage: 'innate',
    description: '体质优势会带来更好的抗压恢复与控场稳定。',
    statMods: { stability: 4 },
    healthDelta: 6,
    missionRiskMod: -3
  },
  {
    id: 'longLivedTendency',
    name: '长寿倾向',
    stage: 'innate',
    description: '衰退会来得更晚一些。',
    lifespanDelta: 18,
    bloodlineValueMod: 8
  },
  {
    id: 'frailBody',
    name: '弱体',
    stage: 'innate',
    description: '恢复速度慢，体质较差。',
    statMods: { constitution: -8 },
    healthDelta: -8,
    missionRiskMod: 6
  },
  {
    id: 'subfertileBody',
    name: '孕程脆弱',
    stage: 'innate',
    description: '更难顺利完成妊娠。',
    fertilityMod: -10,
    missionRiskMod: 2
  },
  {
    id: 'coldAffect',
    name: '疏离感',
    stage: 'innate',
    description: '不易建立亲和，但也不易被魅力带偏。',
    statMods: { gentleness: -6 },
    loyaltyDrainMod: -1,
    missionRiskMod: 4
  }
];

export const GROWTH_TRAITS: TraitDefinition[] = [
  {
    id: 'attachmentFormed',
    name: '依附建立',
    stage: 'growth',
    description: '在熟悉环境中恢复更快，频繁换岗则会不适。',
    loyaltyDrainMod: -1
  },
  {
    id: 'composedUnderPressure',
    name: '临压镇定',
    stage: 'growth',
    description: '对高魅力目标的后期风险更低。',
    missionRiskMod: -6,
    loyaltyDrainMod: -1
  },
  {
    id: 'socialInstinct',
    name: '社交直觉',
    stage: 'growth',
    description: '更容易匹配到合适委托。',
    missionRiskMod: -5,
    bloodlineValueMod: 4
  },
  {
    id: 'overSensitive',
    name: '高敏',
    stage: 'growth',
    description: '对温和目标表现更好，但高压时更容易掉忠诚。',
    loyaltyDrainMod: 1,
    missionRiskMod: 2
  },
  {
    id: 'protocolDrift',
    name: '协议漂移',
    stage: 'growth',
    description: '长期高压下更容易出现自主偏移。',
    missionRiskMod: 6
  },
  {
    id: 'selfAwareness',
    name: '自我意识',
    stage: 'growth',
    description: '复杂目标下更灵活，但长期压榨会触发退出倾向。',
    missionRiskMod: -2,
    bloodlineValueMod: 5
  },
  {
    id: 'bloodlineEcho',
    name: '血脉回响',
    stage: 'growth',
    description: '主导气质更易稳定传承。',
    bloodlineValueMod: 10
  },
  {
    id: 'selfRepair',
    name: '自修复',
    stage: 'growth',
    description: '日常恢复速度更快。',
    healthDelta: 6
  },
  {
    id: 'overworkSensitive',
    name: '过劳敏感',
    stage: 'growth',
    description: '连续派遣会更快损耗健康。',
    healthDelta: -4,
    missionRiskMod: 4
  }
];
