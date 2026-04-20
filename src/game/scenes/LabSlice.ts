import Phaser from 'phaser';
import {
  ALLELE_VALUES,
  BREEDING_GENE_KEYS,
  DEFECT_KEYS,
  DEFECT_LABELS,
  GROWTH_TRAITS,
  INNATE_TRAITS,
  LIFE_STAGE_LABELS,
  STAT_COLORS,
  STAT_KEYS,
  STAT_LABELS,
  type BreedingGeneKey,
  type BreedingGenome,
  type DefectGenome,
  type GeneAllele,
  type GenePair,
  type LifeStage,
  type Sex,
  type StatKey,
  type TraitPolarity,
  type TraitDefinition,
  type VisibleGenome
} from '../data/labConfig';

type RiskBand = '低' | '中' | '高' | '极高';
type RosterTab = 'female' | 'male' | 'sample';
type PageTab = 'breed' | 'assign';
type HelpSection = 'library' | 'monitor' | 'actions';
type MissionDifficulty = 'low' | 'mid' | 'high';
type EventSource = 'day' | 'balance' | 'random';
type PurebloodAllele = 'N' | 'P';
type DegradationAllele = 'N' | 'D';
type PurebloodPair = [PurebloodAllele, PurebloodAllele];
type DegradationPair = [DegradationAllele, DegradationAllele];
type LegacyGenome = { pureblood: PurebloodPair; degradation: DegradationPair };

type TraitEntry = { id: string; name: string; stage: 'innate' | 'growth'; description: string; tier: number; polarity: TraitPolarity };
type PendingGrowthTrait = TraitEntry & { revealAge: number };
type VisibleStats = Record<StatKey, number>;
type LabEventOption = { label: string; effectText: string; apply: () => string };
type LabEvent = { id: string; title: string; body: string; source: EventSource; options: LabEventOption[] };
type BreedingSummary = {
  canBreed: boolean;
  cost: number;
  successBand: RiskBand;
  positiveRange: [number, number];
  negativeRange: [number, number];
  purebloodChance: number;
  degradationChance: number;
  projectedChildTendency: string[];
  purebloodFactors: string[];
  degradationFactors: string[];
  startScore: number;
  riskBoost: number;
};
type TemporaryEffect = {
  id: string;
  title: string;
  description: string;
  daysRemaining: number;
  missionRiskMod?: number;
  exposureDaily?: number;
  loyaltyDaily?: number;
  healthRecoveryDaily?: number;
  breedingCostMod?: number;
};

type SampleCard = {
  id: string;
  name: string;
  source: string;
  quality: 'B' | 'A' | 'S';
  tags: string[];
  usesLeft: number;
  visibleGenome: VisibleGenome;
  breedingGenome: BreedingGenome;
  defectGenome: DefectGenome;
  legacyGenome: LegacyGenome;
};

type MissionClue = { id: string; label: string; text: string; cost: number; unlocked: boolean };

type MissionTarget = {
  id: string;
  name: string;
  title: string;
  difficulty: MissionDifficulty;
  purpose: string;
  duration: number;
  reward: number;
  targetCharisma: number;
  pressure: number;
  difficultyMod: number;
  preferenceStats: StatKey[];
  purposeStats: StatKey[];
  clues: MissionClue[];
  assignedCardId: string | null;
  daysRemaining: number;
  failureRisk: number;
};

type ActiveMission = {
  targetId: string;
  targetLabel: string;
  purpose: string;
  daysRemaining: number;
  failureRisk: number;
  targetCharisma: number;
  pressure: number;
};

type PendingBirth = { children: LabCard[]; fatherLabel: string; daysRemaining: number; gestationRisk: RiskBand };

type LabCard = {
  id: string;
  name: string;
  sex: Sex;
  isPlayerSelf: boolean;
  generation: number;
  ageDays: number;
  lifeStage: LifeStage;
  stamina: number;
  maxStamina: number;
  health: number;
  maxHealth: number;
  loyalty: number;
  maxLoyalty: number;
  bloodlineValue: number;
  visibleStats: VisibleStats;
  visibleGenome: VisibleGenome;
  breedingGenome: BreedingGenome;
  defectGenome: DefectGenome;
  expressedDefects: string[];
  legacyGenome: LegacyGenome;
  innateTraits: TraitEntry[];
  growthTraits: TraitEntry[];
  pendingGrowthTraits: PendingGrowthTrait[];
  tags: string[];
  motherId: string | null;
  fatherId: string | null;
  grandparentIds: string[];
  lifespanPotential: number;
  agingWear: number;
  protocolStability: number;
  mission: ActiveMission | null;
  pregnancy: PendingBirth | null;
};

const LOCUS_MAJOR = 2;
const LOCUS_MINOR = 2;
const ADULT_MISSION_THRESHOLD = 18;
const AGE_GROWTH_REVEAL = 8;
const AGE_MATURE_REVEAL = 18;
const HEADER_HEIGHT = 64;
const CONTENT_TOP = 78;
const FOOTER_TOP = 812;
const FOOTER_HEIGHT = 38;
const LEFT_PANEL_X = 18;
const LEFT_PANEL_Y = CONTENT_TOP;
const LEFT_PANEL_WIDTH = 1064;
const LEFT_PANEL_HEIGHT = 718;
const RIGHT_PANEL_X = 1098;
const RIGHT_PANEL_Y = CONTENT_TOP;
const RIGHT_PANEL_WIDTH = 420;
const MONITOR_PANEL_HEIGHT = 392;
const ACTION_PANEL_Y = 484;
const ACTION_PANEL_HEIGHT = 312;
const ROSTER_CARD_HEIGHT = 136;
const ROSTER_CARD_GAP = 12;
const ROSTER_VIEW_TOP = 204;
const ROSTER_VIEW_BOTTOM = 730;
const genePoolByTier: Record<'strong' | 'good' | 'balanced' | 'weak', GeneAllele[]> = {
  strong: ['S', 'S', 'A', 'A', 'N'],
  good: ['S', 'A', 'A', 'N', 'N', 'B'],
  balanced: ['A', 'N', 'N', 'B', 'S'],
  weak: ['N', 'B', 'B', 'C', 'A']
};
const defectFamilyBias: Record<'low' | 'medium' | 'high', number> = { low: 18, medium: 32, high: 46 };
const UI_FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

export class LabSliceScene extends Phaser.Scene {
  private day = 1;
  private money = 46;
  private exposureRisk = 0;
  private page: PageTab = 'breed';
  private rosterTab: RosterTab = 'female';
  private motherId: string | null = null;
  private fatherCardId: string | null = null;
  private fatherSampleId: string | null = null;
  private assignmentCardId: string | null = null;
  private detailTargetId: string | null = null;
  private traitDetail: { trait: TraitEntry; ownerName: string } | null = null;
  private breedingDetailOpen = false;
  private cards: LabCard[] = [];
  private samples: SampleCard[] = [];
  private targets: MissionTarget[] = [];
  private log: string[] = [];
  private ui: Phaser.GameObjects.GameObject[] = [];
  private rosterScroll = 0;
  private monitorScroll = 0;
  private dragStartY = 0;
  private dragScrollStart = 0;
  private dragging = false;
  private helpSection: HelpSection | null = null;
  private pendingEvent: LabEvent | null = null;
  private seenEventIds = new Set<string>();
  private activeEffects: TemporaryEffect[] = [];
  private nextId = 7;
  private totalBirths = 0;
  private totalAssignments = 0;

  constructor() { super('Game'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#120c18');
    this.installTextFactory();
    this.seed();
    this.drawShell();
    this.setupRosterDragging();
    this.render();
  }

  private seed(): void {
    const female1 = this.createAdultCard('绮宁1号', '女', 1, 28, { appearance: 'strong', figure: 'good', aura: 'strong', gentleness: 'good', eloquence: 'balanced', stability: 'good', constitution: 'balanced' }, { FEC: 'good', GES: 'good', HER: 'balanced', VAR: 'balanced', MND: 'good' }, 'medium');
    const female2 = this.createAdultCard('柔辞2号', '女', 1, 31, { appearance: 'good', figure: 'balanced', aura: 'balanced', gentleness: 'strong', eloquence: 'good', stability: 'good', constitution: 'good' }, { FEC: 'strong', GES: 'good', HER: 'good', VAR: 'balanced', MND: 'good' }, 'low');
    const female3 = this.createAdultCard('澜语3号', '女', 1, 24, { appearance: 'balanced', figure: 'balanced', aura: 'strong', gentleness: 'balanced', eloquence: 'strong', stability: 'balanced', constitution: 'good' }, { FEC: 'balanced', GES: 'good', HER: 'balanced', VAR: 'good', MND: 'balanced' }, 'medium');
    const playerSelf = this.createPlayerSelf();
    const female4 = this.createAdultCard('宁衡4号', '女', 1, 19, { appearance: 'balanced', figure: 'good', aura: 'balanced', gentleness: 'balanced', eloquence: 'balanced', stability: 'strong', constitution: 'strong' }, { FEC: 'good', GES: 'good', HER: 'balanced', VAR: 'weak', MND: 'good' }, 'low');
    this.cards = [female1, female2, female3, female4, playerSelf];
    this.samples = [];
    this.targets = [this.createMissionTarget(), this.createMissionTarget(), this.createMissionTarget()];
    this.pushLog('实验室完成晨检，所有现役个体均为成年人。');
    this.pushLog('开局没有男特工和外部授权样本，实验室当前可用父系来源只有“自己”。');
    this.pushLog('本轮切片改为以预计好特质、预计坏特质、纯血概率和劣化风险来判断繁育价值。');
  }

  private drawShell(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f23);
    this.add.rectangle(width / 2, HEADER_HEIGHT / 2 + 4, width - 12, HEADER_HEIGHT, 0x0d132b, 0.98).setStrokeStyle(1, 0x2a315d);
    this.add.rectangle(LEFT_PANEL_X + LEFT_PANEL_WIDTH / 2, LEFT_PANEL_Y + LEFT_PANEL_HEIGHT / 2, LEFT_PANEL_WIDTH, LEFT_PANEL_HEIGHT, 0x0a1026, 0.98).setStrokeStyle(1, 0x2b3662);
    this.add.rectangle(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, RIGHT_PANEL_Y + MONITOR_PANEL_HEIGHT / 2, RIGHT_PANEL_WIDTH, MONITOR_PANEL_HEIGHT, 0x111631, 0.98).setStrokeStyle(1, 0x2c3661);
    this.add.rectangle(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, ACTION_PANEL_Y + ACTION_PANEL_HEIGHT / 2, RIGHT_PANEL_WIDTH, ACTION_PANEL_HEIGHT, 0x111631, 0.98).setStrokeStyle(1, 0x2c3661);
    this.add.rectangle(width / 2, FOOTER_TOP + FOOTER_HEIGHT / 2, width - 16, FOOTER_HEIGHT, 0x10162f, 0.98).setStrokeStyle(1, 0x273058);
  }

  private setupRosterDragging(): void {
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _t: unknown, _dx: number, dy: number) => {
      if (this.inRoster(pointer.x, pointer.y)) {
        this.rosterScroll = this.snapRosterScroll(this.rosterScroll + (dy > 0 ? ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP : -(ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP)));
        this.render();
        return;
      }
      if (this.inMonitor(pointer.x, pointer.y)) {
        this.monitorScroll = this.clampMonitorScroll(this.monitorScroll + (dy > 0 ? 1 : -1));
        this.render();
      }
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inRoster(pointer.x, pointer.y)) return;
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.dragScrollStart = this.rosterScroll;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.rosterScroll = this.clampScroll(this.dragScrollStart - (pointer.y - this.dragStartY));
      this.render();
    });
    this.input.on('pointerup', () => {
      if (this.dragging) {
        this.rosterScroll = this.snapRosterScroll(this.rosterScroll);
        this.render();
      }
      this.dragging = false;
    });
    this.input.on('pointerupoutside', () => {
      if (this.dragging) {
        this.rosterScroll = this.snapRosterScroll(this.rosterScroll);
        this.render();
      }
      this.dragging = false;
    });
  }

  private render(): void {
    this.ui.forEach((object) => object.destroy());
    this.ui = [];
    this.renderHeader();
    this.renderSectionHelpButtons();
    this.renderRosterTabs();
    this.renderRoster();
    this.renderMonitor();
    this.renderRightPanel();
    this.renderFooter();
    if (this.breedingDetailOpen && this.page === 'breed') this.renderBreedingDetail();
    if (this.detailTargetId) this.renderTargetDetail();
    if (this.traitDetail) this.renderTraitDetail();
    if (this.helpSection) this.renderHelp();
    if (this.pendingEvent) this.renderEventModal();
  }

  private renderHeader(): void {
    const { width } = this.scale;
    const infiltrating = this.cards.filter((card) => !!card.mission).length;
    const pregnant = this.cards.filter((card) => !!card.pregnancy).length;
    const averageHealth = this.cards.length ? Math.round(this.cards.reduce((sum, card) => sum + card.health, 0) / this.cards.length) : 0;
    this.ui.push(
      this.add.rectangle(46, 36, 40, 40, 0x2b1848, 0.98).setStrokeStyle(1, 0xb55cff),
      this.add.text(46, 36, 'DNA', { fontSize: '14px', color: '#ff8af0', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(78, 22, '生化实验室切片', { fontSize: '23px', color: '#fff7fb', fontStyle: 'bold' })
    );
    this.button(280, 20, 116, 32, '推进一天', !this.pendingEvent, () => this.advanceDay(), 0x4338ca);
    this.ui.push(
      this.add.text(430, 24, `日期 ${this.day}`, { fontSize: '11px', color: '#dbe3ff', fontStyle: 'bold' }),
      this.add.text(498, 24, `资金 ${this.money}`, { fontSize: '11px', color: '#ffe082', fontStyle: 'bold' }),
      this.add.text(576, 24, `样本 ${this.samples.length}`, { fontSize: '11px', color: '#60a5fa', fontStyle: 'bold' }),
      this.add.text(654, 24, `潜入 ${infiltrating}`, { fontSize: '11px', color: '#93c5fd', fontStyle: 'bold' }),
      this.add.text(734, 24, `怀孕 ${pregnant}`, { fontSize: '11px', color: '#f9a8d4', fontStyle: 'bold' }),
      this.add.text(812, 24, `暴露 ${this.exposureRisk}/100`, { fontSize: '11px', color: '#86efac', fontStyle: 'bold' }),
      this.add.text(928, 24, `平均健康 ${averageHealth}`, { fontSize: '11px', color: '#dbe3ff', fontStyle: 'bold' })
    );
    this.button(width - 70, 18, 34, 34, '?', !this.pendingEvent, () => {
      this.helpSection = this.page === 'breed' || this.page === 'assign' ? 'actions' : 'library';
      this.render();
    }, 0x253058);
  }

  private renderSectionHelpButtons(): void {
    this.button(LEFT_PANEL_X + LEFT_PANEL_WIDTH - 34, 96, 26, 22, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'library';
      this.render();
    }, 0x4c1d95);
    this.button(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH - 34, 96, 26, 22, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'monitor';
      this.render();
    }, 0x4c1d95);
    this.button(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH - 34, ACTION_PANEL_Y + 16, 26, 22, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'actions';
      this.render();
    }, 0x4c1d95);
  }

  private renderRosterTabs(): void {
    this.ui.push(this.add.text(30, 98, '卡库', { fontSize: '16px', color: '#fff7fb', fontStyle: 'bold' }));
    this.button(30, 124, 74, 28, '女性', this.rosterTab !== 'female', () => { this.rosterTab = 'female'; this.rosterScroll = 0; this.render(); }, 0x2c2351);
    this.button(112, 124, 74, 28, '男性', this.rosterTab !== 'male', () => { this.rosterTab = 'male'; this.rosterScroll = 0; this.render(); }, 0x1d4ed8);
    this.button(194, 124, 104, 28, '带回样本', this.rosterTab !== 'sample', () => { this.rosterTab = 'sample'; this.rosterScroll = 0; this.render(); }, 0x0f766e);
  }

  private renderMonitor(): void {
    const visibleEntries = 8;
    this.monitorScroll = this.clampMonitorScroll(this.monitorScroll);
    const recent = this.log.slice(this.monitorScroll, this.monitorScroll + visibleEntries).map((entry) => this.formatMonitorEntry(entry, 24, 2));
    const panelX = RIGHT_PANEL_X + 10;
    const panelY = RIGHT_PANEL_Y + 12;
    const screenX = RIGHT_PANEL_X + 16;
    const screenY = RIGHT_PANEL_Y + 42;
    this.ui.push(
      this.add.text(panelX + 24, panelY + 8, '~', { fontSize: '14px', color: '#8eb4ff', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(panelX + 42, panelY + 2, '实验室显示屏', { fontSize: '14px', color: '#ecf0ff', fontStyle: 'bold' }),
      this.add.rectangle(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, RIGHT_PANEL_Y + 190, RIGHT_PANEL_WIDTH - 36, 348, 0x1b2243, 0.98).setStrokeStyle(1, 0x303b66),
      this.add.text(screenX + 8, screenY + 4, '最近消息', { fontSize: '11px', color: '#8ab2ff', fontStyle: 'bold' }),
      this.add.text(screenX + RIGHT_PANEL_WIDTH - 76, screenY + 4, `${Math.min(this.monitorScroll + 1, Math.max(1, this.log.length))}/${Math.max(1, this.log.length)}`, { fontSize: '8px', color: '#8ab2ff' })
    );
    recent.forEach((entry, index) => {
      this.ui.push(this.add.text(screenX + 8, screenY + 30 + index * 38, `• ${entry}`, { fontSize: '9px', color: '#d8f9ff', lineSpacing: 3 }));
    });
  }
  private renderRoster(): void {
    const width = 1024;
    const height = ROSTER_CARD_HEIGHT;
    const startX = 28;
    const startY = ROSTER_VIEW_TOP;
    const gap = ROSTER_CARD_GAP;
    const bottom = ROSTER_VIEW_BOTTOM;
    this.rosterScroll = this.clampScroll(this.rosterScroll);
    if (this.rosterTab === 'sample') {
      this.renderSamples(startX, startY, width, height, gap, bottom);
      return;
    }
    this.filteredCards().forEach((card, index) => {
      const x = startX;
      const y = startY + index * (height + gap) - this.rosterScroll;
      if (y + height < startY || y > bottom) return;
      const fill = 0x151b39;
      const stroke = card.sex === '女' ? 0xc455ff : 0x2f80ff;
      this.ui.push(
        this.add.rectangle(x + width / 2, y + height / 2, width, height, fill, 0.98).setStrokeStyle(1, stroke),
        this.add.line(x + 192, y + 64, 0, 0, 392, 0, 0x283257, 0.8).setOrigin(0, 0)
      );
      this.renderCardAvatar(card, x + 46, y + 48);
      this.ui.push(
        this.add.text(x + 98, y + 12, `${card.name} 第${card.generation}代`, { fontSize: '16px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(x + 98, y + 34, this.cardSummaryLine(card), { fontSize: '10px', color: card.sex === '女' ? '#f9a8d4' : '#7dd3fc', wordWrap: { width: 420 } }),
        this.add.text(x + 98, y + 52, `${this.cardStateLabel(card)} | ${card.tags.join(' | ')}`, { fontSize: '10px', color: '#f6dc6b', wordWrap: { width: 420 } })
      );
      this.renderTraitChips(card, x + 98, y + 68);
      this.renderStatBadges(card.visibleStats, x + 98, y + 88);
      this.renderCardButtons(card, x + 730, y + 22);
    });
    this.renderRosterFooter();
  }

  private renderSamples(startX: number, startY: number, width: number, height: number, gap: number, bottom: number): void {
    this.samples.forEach((sample, index) => {
      const x = startX;
      const y = startY + index * (height + gap) - this.rosterScroll;
      if (y + height < startY || y > bottom) return;
      const active = this.fatherSampleId === sample.id;
      this.ui.push(this.add.rectangle(x + width / 2, y + height / 2, width, height, active ? 0x15314a : 0x132430, 0.98).setStrokeStyle(1, active ? 0x93c5fd : 0x38bdf8));
      this.ui.push(
        this.add.text(x + 24, y + 12, sample.name, { fontSize: '15px', color: '#e0f2fe', fontStyle: 'bold' }),
        this.add.text(x + 24, y + 34, `来源: ${sample.source} | 质量 ${sample.quality} | 剩余 ${sample.usesLeft}`, { fontSize: '10px', color: '#93c5fd' }),
        this.add.text(x + 24, y + 52, `标签: ${sample.tags.join(' | ')}`, { fontSize: '10px', color: '#bfdbfe', wordWrap: { width: 420 } }),
        this.add.text(x + 24, y + 72, `倾向: ${this.projectedTendency(this.computeStats(sample.visibleGenome)).join(' / ')}`, { fontSize: '9px', color: '#e0f2fe', wordWrap: { width: 420 } })
      );
      this.button(x + 860, y + 44, 120, 24, active ? '取消样本' : '选为父本', this.page === 'breed', () => this.setFatherSample(sample.id), 0x1d4ed8);
    });
    this.renderRosterFooter();
  }

  private renderRightPanel(): void {
    this.ui.push(this.add.text(RIGHT_PANEL_X + 18, ACTION_PANEL_Y + 12, '主操控区', { fontSize: '16px', color: '#fff7fb', fontStyle: 'bold' }));
    this.button(RIGHT_PANEL_X + 124, ACTION_PANEL_Y + 14, 58, 22, '繁育', this.page !== 'breed', () => { this.page = 'breed'; this.render(); }, 0x2c2351);
    this.button(RIGHT_PANEL_X + 188, ACTION_PANEL_Y + 14, 58, 22, '委托', this.page !== 'assign', () => { this.page = 'assign'; this.render(); }, 0x047857);
    if (this.page === 'breed') {
      this.renderBreedingPanel();
      return;
    }
    this.renderAssignmentPanel();
  }

  private renderBreedingPanel(): void {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    const sample = this.sample(this.fatherSampleId);
    const summary = this.breedingSummary();
    this.ui.push(
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 54, '教育台', { fontSize: '13px', color: '#f5d0fe', fontStyle: 'bold' }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 76, mother ? `母本: ${mother.name} | ${LIFE_STAGE_LABELS[mother.lifeStage]} | 体力${mother.stamina} | 健康${mother.health}` : '母本: 未选择', { fontSize: '10px', color: mother ? '#f5d0fe' : '#94a3b8', wordWrap: { width: 220 } }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 98, father ? `父本: ${father.name} | 遗传潜力${father.bloodlineValue}` : sample ? `外部样本: ${sample.name} | 质量${sample.quality}` : '父本: 未选择', { fontSize: '10px', color: father || sample ? '#dbeafe' : '#94a3b8', wordWrap: { width: 220 } }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 126, `预计好特质 ${summary.positiveRange[0]}~${summary.positiveRange[1]}`, { fontSize: '11px', color: '#86efac', fontStyle: 'bold' }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 146, `预计坏特质 ${summary.negativeRange[0]}~${summary.negativeRange[1]}`, { fontSize: '11px', color: '#f6dc6b', fontStyle: 'bold' }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 166, `纯血概率 ${summary.purebloodChance}% | 劣化风险 ${summary.degradationChance}%`, { fontSize: '11px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 186, `费用 ${summary.cost}`, { fontSize: '12px', color: '#ecf3ff', fontStyle: 'bold' })
    );
    this.button(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 210, 74, 24, '配对详情', !!mother && (!!father || !!sample), () => { this.breedingDetailOpen = true; this.render(); }, 0x334155);
    this.button(RIGHT_PANEL_X + 96, ACTION_PANEL_Y + 210, 90, 24, '开始繁育', summary.canBreed, () => this.startBreeding(), 0x7c3aed);
    this.button(RIGHT_PANEL_X + 192, ACTION_PANEL_Y + 210, 54, 24, '清空', !!this.motherId || !!this.fatherCardId || !!this.fatherSampleId, () => { this.motherId = null; this.fatherCardId = null; this.fatherSampleId = null; this.breedingDetailOpen = false; this.render(); }, 0x334155);
  }

  private renderBreedingDetail(): void {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    const sample = this.sample(this.fatherSampleId);
    const summary = this.breedingSummary();
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 680;
    const panelHeight = 390;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;
    const blocker = this.add.rectangle(centerX, centerY, width, height, 0x05030a, 0.82).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.breedingDetailOpen = false;
      this.render();
    });
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x16111e, 0.98).setStrokeStyle(2, 0x8b5cf6).setInteractive();
    this.ui.push(
      blocker,
      panel,
      this.add.text(left + 24, top + 24, '配对详情', { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(left + 24, top + 60, `母本: ${mother ? `${mother.name} | 体力${mother.stamina} | 健康${mother.health}` : '未选择'}`, { fontSize: '12px', color: mother ? '#f5d0fe' : '#94a3b8' }),
      this.add.text(left + 24, top + 80, `父本: ${father ? `${father.name} | 遗传潜力${father.bloodlineValue}` : sample ? `${sample.name} | 质量${sample.quality}` : '未选择'}`, { fontSize: '12px', color: father || sample ? '#dbeafe' : '#94a3b8' }),
      this.add.text(left + 24, top + 116, `启动倾向: ${summary.successBand}`, { fontSize: '13px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(left + 24, top + 138, `预计好特质: ${summary.positiveRange[0]} ~ ${summary.positiveRange[1]}`, { fontSize: '13px', color: '#86efac' }),
      this.add.text(left + 24, top + 158, `预计坏特质: ${summary.negativeRange[0]} ~ ${summary.negativeRange[1]}`, { fontSize: '13px', color: '#fca5a5' }),
      this.add.text(left + 24, top + 180, `纯血概率: ${summary.purebloodChance}%`, { fontSize: '13px', color: '#fde68a' }),
      this.add.text(left + 24, top + 200, `劣化风险: ${summary.degradationChance}%`, { fontSize: '13px', color: '#fb7185' }),
      this.add.text(left + 24, top + 222, `费用: ${summary.cost}`, { fontSize: '13px', color: '#bfdbfe', fontStyle: 'bold' }),
      this.add.text(left + 24, top + 258, '纯血加分项', { fontSize: '12px', color: '#86efac', fontStyle: 'bold' }),
      this.add.text(left + 24, top + 278, summary.purebloodFactors.length ? summary.purebloodFactors.map((line) => `- ${line}`).join('\n') : '- 当前加分项较少', { fontSize: '11px', color: '#d9f99d', lineSpacing: 4 }),
      this.add.text(left + 310, top + 258, '劣化加重项', { fontSize: '12px', color: '#fca5a5', fontStyle: 'bold' }),
      this.add.text(left + 310, top + 278, summary.degradationFactors.length ? summary.degradationFactors.map((line) => `- ${line}`).join('\n') : '- 当前暂无明显劣化压力', { fontSize: '11px', color: '#fecdd3', lineSpacing: 4 })
    );
    this.button(left + panelWidth - 80, top + 20, 56, 22, '关闭', true, () => { this.breedingDetailOpen = false; this.render(); }, 0x7f1d1d);
    this.button(left + panelWidth - 144, top + panelHeight - 42, 120, 26, '开始繁育', summary.canBreed, () => { this.breedingDetailOpen = false; this.startBreeding(); }, 0x7c3aed);
  }

  private renderAssignmentPanel(): void {
    const operative = this.card(this.assignmentCardId);
    this.ui.push(
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 54, '委托台', { fontSize: '13px', color: '#bbf7d0', fontStyle: 'bold' }),
      this.add.text(RIGHT_PANEL_X + 16, ACTION_PANEL_Y + 76, operative ? `特工: ${operative.name} | 年龄${operative.ageDays} | 健康${operative.health} | 忠诚${operative.loyalty}` : '特工: 未选择', { fontSize: '10px', color: operative ? '#dcfce7' : '#94a3b8', wordWrap: { width: 220 } })
    );
    this.targets.forEach((target, index) => {
      const y = ACTION_PANEL_Y + 96 + index * 38;
      const active = !!target.assignedCardId;
      const assigned = this.card(target.assignedCardId);
      const stroke = this.missionDifficultyColor(target.difficulty);
      const difficultyLabel = this.missionDifficultyLabel(target.difficulty);
      this.ui.push(
        this.add.rectangle(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, y + 14, 228, 32, active ? 0x1d2f2a : 0x24152b, 0.98).setStrokeStyle(1, active ? 0x10b981 : stroke),
        this.add.text(RIGHT_PANEL_X + 20, y + 2, `${difficultyLabel} | ${target.name} · ${target.title}`, { fontSize: '9px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(RIGHT_PANEL_X + 20, y + 14, target.purpose, { fontSize: '8px', color: '#fde68a', wordWrap: { width: 128 } })
      );
      if (active) {
        this.ui.push(this.add.text(RIGHT_PANEL_X + 20, y + 24, `${assigned?.name ?? '失联'} | ${target.daysRemaining}天 | 风险${Math.round(target.failureRisk)}%`, { fontSize: '8px', color: '#bbf7d0', wordWrap: { width: 126 } }));
      } else {
        this.ui.push(this.add.text(RIGHT_PANEL_X + 20, y + 24, `报酬 ${target.reward} | 压力 ${target.pressure}`, { fontSize: '8px', color: '#bfdbfe' }));
      }
      this.button(RIGHT_PANEL_X + 152, y + 2, 32, 16, '详情', true, () => { this.detailTargetId = target.id; this.render(); }, 0x6d28d9);
      this.button(RIGHT_PANEL_X + 188, y + 2, 24, 16, '换', !active && this.money >= 4, () => this.refreshTarget(target.id), 0x0f766e);
      this.button(RIGHT_PANEL_X + 152, y + 18, 60, 14, active ? '进行中' : '派出', !active && this.canAssign(target.id), () => this.assignTarget(target.id), 0x047857);
    });
  }

  private renderRosterFooter(): void {
    const footerY = LEFT_PANEL_Y + LEFT_PANEL_HEIGHT - 34;
    this.ui.push(
      this.add.line(LEFT_PANEL_X + 18, footerY - 8, 0, 0, LEFT_PANEL_WIDTH - 36, 0, 0x24315a, 0.8).setOrigin(0, 0),
      this.add.text(LEFT_PANEL_X + 24, footerY + 6, '滚轮或拖动浏览卡库', { fontSize: '10px', color: '#7d8db7' }),
      this.add.text(LEFT_PANEL_X + LEFT_PANEL_WIDTH - 116, footerY + 6, `共 ${this.rosterTab === 'sample' ? this.samples.length : this.filteredCards().length} 张切片`, { fontSize: '11px', color: '#aeb9de' })
    );
  }

  private renderFooter(): void {
    const infiltrating = this.cards.filter((card) => !!card.mission).length;
    const labScore = this.day * 18 + this.totalBirths * 42 + this.totalAssignments * 28;
    const level = Math.max(1, Math.floor(labScore / 260) + 1);
    const current = labScore % 260;
    const barWidth = 108;
    this.ui.push(
      this.add.text(38, FOOTER_TOP + 12, `实验室等级 Lv.${level}`, { fontSize: '11px', color: '#dbe3ff', fontStyle: 'bold' }),
      this.add.rectangle(190, FOOTER_TOP + 18, barWidth, 8, 0x1c2446, 0.98).setStrokeStyle(1, 0x2c3765),
      this.add.rectangle(136 + (current / 260) * barWidth / 2, FOOTER_TOP + 18, (current / 260) * barWidth, 8, 0x2f85ff, 0.98),
      this.add.text(248, FOOTER_TOP + 12, `${current}/260`, { fontSize: '10px', color: '#8ba2dd' }),
      this.add.text(396, FOOTER_TOP + 12, `系统状态 正常`, { fontSize: '11px', color: '#86efac', fontStyle: 'bold' }),
      this.add.text(566, FOOTER_TOP + 12, `进行中任务 ${infiltrating}`, { fontSize: '11px', color: '#dbe3ff' }),
      this.add.text(770, FOOTER_TOP + 12, `日志 ${this.log.length}`, { fontSize: '11px', color: '#dbe3ff' }),
      this.add.text(926, FOOTER_TOP + 12, `活跃效果 ${this.activeEffects.length}`, { fontSize: '11px', color: '#dbe3ff' }),
      this.add.text(1166, FOOTER_TOP + 12, `Day ${this.day}`, { fontSize: '11px', color: '#dbe3ff' }),
      this.add.text(1474, FOOTER_TOP + 12, '设置', { fontSize: '11px', color: '#8ba2dd' }).setOrigin(1, 0)
    );
  }

  private renderTargetDetail(): void {
    const target = this.target(this.detailTargetId);
    if (!target) { this.detailTargetId = null; return; }
    const difficultyLabel = this.missionDifficultyLabel(target.difficulty);
    const difficultyColor = this.missionDifficultyColor(target.difficulty);
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 720;
    const panelHeight = 406;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;
    const blocker = this.add.rectangle(centerX, centerY, width, height, 0x05030a, 0.82).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.detailTargetId = null;
      this.render();
    });
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x16111e, 0.98).setStrokeStyle(2, difficultyColor).setInteractive();
    this.ui.push(
      blocker,
      panel,
      this.add.text(left + 28, top + 22, `${target.name} · ${target.title}`, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(left + 28, top + 54, `${difficultyLabel} | 目标目的: ${target.purpose}`, { fontSize: '13px', color: '#fde68a' }),
      this.add.text(left + 28, top + 76, `报酬 ${target.reward} | 持续 ${target.duration} 天 | 魅力 ${target.targetCharisma} | 压力 ${target.pressure}`, { fontSize: '12px', color: '#a7f3d0' })
    );
    target.clues.forEach((clue, index) => {
      const y = top + 114 + index * 54;
      this.ui.push(this.add.rectangle(centerX, y + 16, 500, 40, 0x0b1319, 0.94).setStrokeStyle(1, 0x38bdf8), this.add.text(left + 44, y + 2, clue.label, { fontSize: '11px', color: '#67e8f9', fontStyle: 'bold' }));
      if (clue.unlocked) this.ui.push(this.add.text(left + 44, y + 18, this.wrapUiText(clue.text, 28), { fontSize: '10px', color: '#d8f9ff' }));
      else {
        this.ui.push(this.add.text(left + 44, y + 18, '??? 支付资金后解锁。', { fontSize: '10px', color: '#94a3b8' }));
        this.button(left + panelWidth - 130, y + 10, 86, 18, `解锁 ${clue.cost}`, this.money >= clue.cost && !target.assignedCardId, () => this.unlockClue(target.id, clue.id), 0x0f766e);
      }
    });
    this.button(left + panelWidth - 88, top + 18, 60, 20, '关闭', true, () => { this.detailTargetId = null; this.render(); }, 0x7f1d1d);
  }

  private renderHelp(): void {
    if (!this.helpSection) return;
    const title = this.helpSection === 'library' ? '卡库说明' : this.helpSection === 'monitor' ? '显示屏说明' : '主操作区说明';
    const lines =
      this.helpSection === 'library'
        ? [
            '1. 左侧卡库分为女性、男性、带回样本三个页签。',
            '2. 女性卡可执行委托，也可作为母本参与繁育。',
            '3. 男性卡主要作为父本使用；带回样本也可替代父本。',
            '4. 卡面重点看生命阶段、体力、健康、忠诚、特质、缺陷与状态。',
            '5. 鼠标滚轮或拖动可上下浏览更多卡片。'
          ]
        : this.helpSection === 'monitor'
          ? [
              '1. 显示屏展示实验室当前日期、资金、样本数、潜入人数与怀孕人数。',
              '2. 暴露风险达到 100 时，本轮项目会直接失败。',
              '3. 平均健康和衰退/老化人数用于快速判断整体运营压力。',
              '4. 持续状态会显示事件带来的短期后效，例如公关掩护、维保周期或合规缓冲。',
              '5. 将鼠标放在显示屏上滚轮滚动，可以查看更多历史事件。'
            ]
          : [
              '1. 主操作区分为繁育与委托两个页签。',
              '2. 繁育页只显示预计好特质、预计坏特质、纯血概率、劣化风险与费用。',
              '3. 点击“配对详情”可以查看本次配对的加分项与劣化来源，不再把长说明挤在右下角。',
              '4. 委托页会显示目标卡片、风险与可执行操作，目标难度会影响线索、需求和报酬。',
              '5. 如果按钮不可点，通常是因为角色状态或资源尚未满足条件。'
            ];
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 710;
    const panelHeight = 390;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;
    const blocker = this.add.rectangle(centerX, centerY, width, height, 0x05030a, 0.8).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.helpSection = null;
      this.render();
    });
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1222, 0.98).setStrokeStyle(2, 0x7e22ce).setInteractive();
    this.ui.push(
      blocker,
      panel,
      this.add.text(left + 30, top + 24, title, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' })
    );
    lines.forEach((line, index) => {
      this.ui.push(this.add.text(left + 30, top + 70 + index * 44, this.wrapUiText(line, 32), { fontSize: '13px', color: index % 2 === 0 ? '#f5d0fe' : '#bfdbfe' }));
    });
    this.button(left + panelWidth - 76, top + 20, 46, 24, '关闭', true, () => { this.helpSection = null; this.render(); }, 0x7f1d1d);
  }

  private renderTraitDetail(): void {
    if (!this.traitDetail) return;
    const { trait, ownerName } = this.traitDetail;
    const stageLabel = `${trait.stage === 'innate' ? '先天特质' : '成长特质'} | ${trait.polarity === 'positive' ? '正面' : '负面'} | ${this.tierLabel(trait.tier, true)}`;
    const effectLines = this.traitEffectLines(trait);
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 560;
    const panelHeight = 300;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;
    const blocker = this.add.rectangle(centerX, centerY, width, height, 0x05030a, 0.76).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.traitDetail = null;
      this.render();
    });
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x181322, 0.98).setStrokeStyle(2, 0x8b5cf6).setInteractive();
    this.ui.push(
      blocker,
      panel,
      this.add.text(left + 26, top + 28, `${ownerName} · ${trait.name}`, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(left + 26, top + 62, stageLabel, { fontSize: '13px', color: '#c4b5fd', fontStyle: 'bold' }),
      this.add.text(left + 26, top + 94, this.wrapUiText(trait.description, 26), { fontSize: '14px', color: '#e9d5ff', lineSpacing: 3 }),
      this.add.text(left + 26, top + 152, '具体效果', { fontSize: '13px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(left + 26, top + 176, effectLines.join('\n'), { fontSize: '12px', color: '#dbeafe', lineSpacing: 4 })
    );
    this.button(left + panelWidth - 84, top + 24, 58, 22, '关闭', true, () => {
      this.traitDetail = null;
      this.render();
    }, 0x7f1d1d);
  }

  private renderEventModal(): void {
    if (!this.pendingEvent) return;
    const event = this.pendingEvent;
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 700;
    const panelHeight = 360;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;
    const blocker = this.add.rectangle(centerX, centerY, width, height, 0x04030a, 0.84).setInteractive();
    this.ui.push(blocker);
    this.ui.push(
      this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x181322, 0.98).setStrokeStyle(2, 0xf59e0b),
      this.add.text(left + 30, top + 26, '实验室事件', { fontSize: '18px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(left + 30, top + 58, event.title, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(left + 30, top + 94, this.wrapUiText(event.body, 34), { fontSize: '14px', color: '#e9d5ff', lineSpacing: 4 })
    );
    event.options.forEach((option, index) => {
      const y = top + 190 + index * 64;
      this.ui.push(this.add.text(left + 60, y - 20, this.wrapUiText(option.effectText, 28), { fontSize: '12px', color: '#cbd5e1' }));
      this.button(left + 30, y, 520, 28, option.label, true, () => this.resolveEventOption(index), 0x7c3aed);
    });
  }

  private renderCardAvatar(card: LabCard, x: number, y: number): void {
    const tint = card.sex === '女' ? 0xf472b6 : 0x60a5fa;
    const shell = card.sex === '女' ? 0x4a1d3f : 0x1f3a5f;
    this.ui.push(
      this.add.circle(x, y - 16, 14, tint, 0.94).setStrokeStyle(2, 0xfdf2f8),
      this.add.rectangle(x, y + 16, 26, 32, shell, 0.96).setStrokeStyle(2, tint),
      this.add.rectangle(x - 14, y + 6, 8, 16, tint, 0.92),
      this.add.rectangle(x + 14, y + 6, 8, 16, tint, 0.92),
      this.add.text(x, y + 42, card.sex, { fontSize: '12px', color: card.sex === '女' ? '#f9a8d4' : '#93c5fd', fontStyle: 'bold' }).setOrigin(0.5)
    );
  }

  private renderTraitChips(card: LabCard, x: number, y: number): void {
    const positive = this.positiveTraits(card).slice(0, 2);
    const negative = this.negativeTraits(card).slice(0, 2);
    const traits = [...positive, ...negative];
    if (!traits.length) {
      this.ui.push(this.add.text(x, y, '特质: 暂无', { fontSize: '9px', color: '#e9d5ff' }));
      return;
    }
    this.ui.push(this.add.text(x, y, '特质:', { fontSize: '9px', color: '#e9d5ff' }));
    traits.forEach((trait, index) => {
      const bx = x + 38 + index * 94;
      const isNegative = trait.polarity === 'negative';
      const bg = this.add.rectangle(bx + 38, y + 7, 76, 18, isNegative ? 0x4a1d2c : 0x3b2a55, 0.96).setStrokeStyle(1, isNegative ? 0xfda4af : 0xc4b5fd);
      const text = this.add.text(bx + 38, y + 7, `${trait.name}${this.tierLabel(trait.tier)}`, { fontSize: '8px', color: isNegative ? '#fff1f2' : '#f5f3ff', fontStyle: 'bold' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.traitDetail = { trait, ownerName: card.name };
        this.render();
      });
      this.ui.push(bg, text);
    });
  }

  private traitEffectLines(trait: TraitEntry): string[] {
    const definition = this.traitDefinition(trait.id);
    if (!definition) return ['- 当前版本未找到这项特质的效果定义'];
    const lines: string[] = [];
    if (definition.statMods) {
      Object.entries(definition.statMods).forEach(([key, value]) => {
        if (!value) return;
        const amount = value * trait.tier;
        lines.push(`- ${STAT_LABELS[key as StatKey]} ${amount > 0 ? '+' : ''}${amount}`);
      });
    }
    if (definition.statCaps) {
      Object.entries(definition.statCaps).forEach(([key, value]) => {
        if (!value) return;
        const amount = value * trait.tier;
        lines.push(`- ${STAT_LABELS[key as StatKey]}上限 ${amount > 0 ? '+' : ''}${amount}`);
      });
    }
    if (definition.missionRiskMod) {
      const amount = definition.missionRiskMod * trait.tier;
      lines.push(`- 委托风险 ${amount > 0 ? '+' : ''}${amount}`);
    }
    if (definition.loyaltyDrainMod) {
      const amount = definition.loyaltyDrainMod * trait.tier;
      lines.push(`- 委托中忠诚流失 ${amount > 0 ? '+' : ''}${amount}`);
    }
    if (definition.healthDelta) {
      const amount = definition.healthDelta * trait.tier;
      lines.push(`- 健康倾向 ${amount > 0 ? '+' : ''}${amount}`);
    }
    if (definition.lifespanDelta) {
      const amount = definition.lifespanDelta * trait.tier;
      lines.push(`- 寿命潜力 ${amount > 0 ? '+' : ''}${amount}`);
    }
    if (definition.fertilityMod) {
      const amount = definition.fertilityMod * trait.tier;
      lines.push(`- 繁育倾向 ${amount > 0 ? '+' : ''}${amount}`);
    }
    if (!lines.length) lines.push('- 这项特质当前没有单独数值修正，主要通过描述层表达倾向');
    return lines;
  }

  private renderStatBadges(stats: VisibleStats, x: number, y: number): void {
    const top = STAT_KEYS.slice(0, 4);
    const bottom = STAT_KEYS.slice(4);
    top.forEach((key, index) => {
      this.ui.push(this.add.text(x + index * 102, y, this.scoreLabel(key, stats[key]), { fontSize: '9px', color: STAT_COLORS[key], fontStyle: 'bold' }));
    });
    bottom.forEach((key, index) => {
      this.ui.push(this.add.text(x + index * 136, y + 14, this.scoreLabel(key, stats[key]), { fontSize: '9px', color: STAT_COLORS[key], fontStyle: 'bold' }));
    });
  }

  private renderCardButtons(card: LabCard, x: number, y: number): void {
    if (this.page === 'breed') {
      if (card.sex === '女') {
        this.button(x, y, 72, 20, this.motherId === card.id ? '取消母本' : (this.motherBlockedReason(card) ?? '选母本'), this.canToggleMother(card), () => this.toggleMother(card.id), 0x7c3aed);
        this.button(x + 80, y, 62, 20, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
        this.button(x + 148, y, 62, 20, '医护', this.canMedicate(card), () => this.medicateCard(card.id), 0x0f766e);
        this.button(x + 80, y + 26, 86, 20, '淘汰', !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
      } else {
        this.button(x, y, 72, 20, this.fatherCardId === card.id ? '取消父本' : (this.fatherBlockedReason(card) ?? '选父本'), this.canToggleFather(card), () => this.toggleFather(card.id), 0x1d4ed8);
        this.button(x + 80, y, 62, 20, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
        this.button(x + 148, y, 62, 20, '改名', card.isPlayerSelf, () => this.renameCard(card.id), 0x0f766e);
        this.button(x + 80, y + 26, 86, 20, card.isPlayerSelf ? '本人' : '淘汰', !card.isPlayerSelf && !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
      }
      return;
    }
    if (card.sex === '女') {
      this.button(x, y, 72, 20, this.assignmentCardId === card.id ? '取消特工' : (this.assignmentBlockedReason(card) ?? '选特工'), this.assignmentCardId === card.id || this.canSetAssignment(card), () => this.toggleAssignment(card.id), 0x047857);
      this.button(x + 80, y, 62, 20, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
      this.button(x + 148, y, 62, 20, '医护', this.canMedicate(card), () => this.medicateCard(card.id), 0x0f766e);
      this.button(x + 80, y + 26, 86, 20, '淘汰', !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
    } else {
      this.button(x + 80, y, 62, 20, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
      this.button(x + 148, y, 62, 20, '改名', card.isPlayerSelf, () => this.renameCard(card.id), 0x0f766e);
      this.button(x + 80, y + 26, 86, 20, card.isPlayerSelf ? '本人' : '淘汰', !card.isPlayerSelf && !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
    }
  }

  private compactLogLine(entry: string, maxChars: number): string {
    return entry.length > maxChars ? `${entry.slice(0, maxChars - 1)}…` : entry;
  }

  private missionDifficultyLabel(difficulty: MissionDifficulty): string {
    if (difficulty === 'low') return '低难度';
    if (difficulty === 'mid') return '中难度';
    return '高难度';
  }

  private missionDifficultyColor(difficulty: MissionDifficulty): number {
    if (difficulty === 'low') return 0x22c55e;
    if (difficulty === 'mid') return 0xf59e0b;
    return 0xef4444;
  }

  private missionDifficultyConfig(difficulty: MissionDifficulty): {
    rewardMin: number;
    rewardMax: number;
    charismaMin: number;
    charismaMax: number;
    pressureMin: number;
    pressureMax: number;
    durationMin: number;
    durationMax: number;
    difficultyMod: number;
    unlockedClues: number[];
  } {
    if (difficulty === 'low') {
      return { rewardMin: 9, rewardMax: 13, charismaMin: 1, charismaMax: 3, pressureMin: 1, pressureMax: 2, durationMin: 2, durationMax: 3, difficultyMod: -8, unlockedClues: [1, 2] };
    }
    if (difficulty === 'mid') {
      return { rewardMin: 14, rewardMax: 18, charismaMin: 2, charismaMax: 4, pressureMin: 2, pressureMax: 3, durationMin: 3, durationMax: 4, difficultyMod: 0, unlockedClues: [1] };
    }
    return { rewardMin: 19, rewardMax: 24, charismaMin: 3, charismaMax: 5, pressureMin: 3, pressureMax: 5, durationMin: 4, durationMax: 5, difficultyMod: 8, unlockedClues: [] };
  }

  private rollMissionDifficulty(): MissionDifficulty {
    const roll = Phaser.Math.Between(1, 100);
    if (this.day <= 8) {
      if (roll <= 60) return 'low';
      if (roll <= 90) return 'mid';
      return 'high';
    }
    if (this.day <= 18) {
      if (roll <= 40) return 'low';
      if (roll <= 80) return 'mid';
      return 'high';
    }
    if (roll <= 25) return 'low';
    if (roll <= 70) return 'mid';
    return 'high';
  }

  private rollLabEvent(): void {
    if (this.pendingEvent) return;
    const candidates = this.buildLabEvents();
    if (!candidates.length) return;
    if (Phaser.Math.Between(1, 100) > 20) return;
    this.pendingEvent = Phaser.Utils.Array.GetRandom(candidates);
    if (this.pendingEvent.source === 'day') this.seenEventIds.add(this.pendingEvent.id);
  }

  private buildLabEvents(): LabEvent[] {
    const events: LabEvent[] = [];
    const females = this.cards.filter((card) => card.sex === '女');
    const averageFemaleLoyalty = females.length ? Math.round(females.reduce((sum, card) => sum + card.loyalty, 0) / females.length) : 100;
    const averageHealth = this.cards.length ? Math.round(this.cards.reduce((sum, card) => sum + card.health, 0) / this.cards.length) : 100;
    const decliningCards = this.cards.filter((card) => card.lifeStage === 'declining' || card.lifeStage === 'aging');
    const idleFemale = this.randomFemale((card) => !card.mission && !card.pregnancy);
    const lowLoyaltyFemale = this.randomFemale((card) => !card.mission && !card.pregnancy && card.loyalty <= 46);
    const pregnantFemale = this.randomFemale((card) => !!card.pregnancy);
    const unstableFemale = this.randomFemale((card) => !card.mission && card.protocolStability <= 40);
    const agingCard = decliningCards.length ? Phaser.Utils.Array.GetRandom(decliningCards) : null;
    if (this.day >= 4 && !this.seenEventIds.has('hearing-brief')) {
      events.push({
        id: 'hearing-brief',
        title: '合法化听证预热',
        body: '制造公司准备向市政委员会推动仿生人合法化。公关部要求你决定是否提前投放一批“稳定陪同”案例，用来对冲赏金猎人的舆论攻势。',
        source: 'day',
        options: [
          {
            label: '拨款做公关',
            effectText: '资金 -8，暴露风险 -6，并形成 3 天公关掩护。',
            apply: () => {
              this.money = Math.max(0, this.money - 8);
              this.exposureRisk = Math.max(0, this.exposureRisk - 6);
              this.addTimedEffect({ id: 'pr-cover', title: '公关掩护', description: '委托风险-4 暴露每日-1', daysRemaining: 3, missionRiskMod: -4, exposureDaily: -1 });
              return '实验室提前铺开公关口径，接下来几天都会有一层额外掩护';
            }
          },
          { label: '让一名特工配合媒体演示', effectText: '一名空闲女性忠诚 -6，资金 -3，暴露风险 -10。', apply: () => { if (idleFemale) idleFemale.loyalty = Math.max(0, idleFemale.loyalty - 6); this.money = Math.max(0, this.money - 3); this.exposureRisk = Math.max(0, this.exposureRisk - 10); return `${idleFemale?.name ?? '一名特工'} 配合了媒体演示，实验室换来了更大的安全缓冲`; } },
          { label: '暂不表态', effectText: '无资金成本，暴露风险 +5。', apply: () => { this.exposureRisk = Math.min(100, this.exposureRisk + 5); return '公司选择观望，赏金猎人话术在街头更占上风'; } }
        ]
      });
    }
    if (this.day >= 7 && !this.seenEventIds.has('board-directive')) {
      events.push({
        id: 'board-directive',
        title: '董事会窗口期',
        body: '制造公司董事会认为，现在是推动仿生人合法化的短暂窗口。可如果投入过猛，赏金猎人也会更快把火力对准实验室。你必须决定资源往哪里偏。 ',
        source: 'day',
        options: [
          {
            label: '追加“合法陪同”样板计划',
            effectText: '资金 -9，暴露风险 -5，一名空闲女性忠诚 -4。',
            apply: () => {
              this.money = Math.max(0, this.money - 9);
              this.exposureRisk = Math.max(0, this.exposureRisk - 5);
              if (idleFemale) idleFemale.loyalty = Math.max(0, idleFemale.loyalty - 4);
              return `${idleFemale?.name ?? '一名特工'} 被抽去做样板案例，董事会对合法化项目更有信心了`;
            }
          },
          {
            label: '把预算转向反赏金猎人网络',
            effectText: '资金 -6，暴露风险 -11，一名女性健康 -4，并形成 2 天反猎网幕。',
            apply: () => {
              this.money = Math.max(0, this.money - 6);
              this.exposureRisk = Math.max(0, this.exposureRisk - 11);
              const female = this.randomFemale((card) => !card.pregnancy);
              if (female) female.health = Math.max(0, female.health - 4);
              this.addTimedEffect({ id: 'hunter-screen', title: '反猎网幕', description: '暴露每日-2 委托风险+2', daysRemaining: 2, exposureDaily: -2, missionRiskMod: 2 });
              return `${female?.name ?? '一名特工'} 被迫承担额外掩护工作，实验室换来一段更安静但更紧绷的窗口`;
            }
          },
          {
            label: '拖延决议继续观望',
            effectText: '资金 +3，暴露风险 +7。',
            apply: () => {
              this.money += 3;
              this.exposureRisk = Math.min(100, this.exposureRisk + 7);
              return '董事会决定先保现金流，但合法化窗口开始被赏金猎人的叙事蚕食';
            }
          }
        ]
      });
    }
    if (this.day >= 10 && !this.seenEventIds.has('hunter-sweep')) {
      events.push({
        id: 'hunter-sweep',
        title: '赏金猎人清查',
        body: '几名赏金猎人开始排查你们的委托网络。制造公司要求你决定，是立刻切断部分外部联系，还是继续维持当前运营强度来保护“合法化窗口”。',
        source: 'day',
        options: [
          { label: '切断网络并清洗记录', effectText: '资金 -10，暴露风险 -14。', apply: () => { this.money = Math.max(0, this.money - 10); this.exposureRisk = Math.max(0, this.exposureRisk - 14); return '实验室烧掉了一批渠道记录，安全性上升但现金流明显吃紧'; } },
          { label: '让一名特工做假线诱导', effectText: '一名空闲女性健康 -6，忠诚 -8，暴露风险 -18。', apply: () => { if (idleFemale) { idleFemale.health = Math.max(0, idleFemale.health - 6); idleFemale.loyalty = Math.max(0, idleFemale.loyalty - 8); } this.exposureRisk = Math.max(0, this.exposureRisk - 18); return `${idleFemale?.name ?? '一名特工'} 去牵制了赏金猎人，实验室暂时脱离风口`; } },
          { label: '维持现状', effectText: '无资金成本，暴露风险 +10。', apply: () => { this.exposureRisk = Math.min(100, this.exposureRisk + 10); return '制造公司没有松手，赏金猎人的注意力继续向实验室靠拢'; } }
        ]
      });
    }
    if (this.day >= 16 && !this.seenEventIds.has('compliance-window')) {
      events.push({
        id: 'compliance-window',
        title: '合规窗口',
        body: '一位同情仿生人合法化的委员会秘书暗示，只要你们能提交一批“稳定且可控”的个体档案，下一轮听证就会更友好。可任何档案都意味着真实暴露。 ',
        source: 'day',
        options: [
          {
            label: '提交一套保守档案',
            effectText: '资金 -5，暴露风险 -8，一名女性忠诚 -5，并形成 3 天合规缓冲。',
            apply: () => {
              this.money = Math.max(0, this.money - 5);
              this.exposureRisk = Math.max(0, this.exposureRisk - 8);
              const female = this.randomFemale((card) => !card.mission);
              if (female) female.loyalty = Math.max(0, female.loyalty - 5);
              this.addTimedEffect({ id: 'compliance-soften', title: '合规缓冲', description: '繁育费用-2 暴露每日-1', daysRemaining: 3, breedingCostMod: -2, exposureDaily: -1 });
              return `${female?.name ?? '一名特工'} 的档案被作为合规案例提交，实验室接下来几天会更好呼吸`;
            }
          },
          {
            label: '伪造一份过于完美的报告',
            effectText: '资金 -2，暴露风险 -12，一名女性协议稳定 -8。',
            apply: () => {
              this.money = Math.max(0, this.money - 2);
              this.exposureRisk = Math.max(0, this.exposureRisk - 12);
              const female = unstableFemale ?? this.randomFemale((card) => !card.mission);
              if (female) female.protocolStability = Math.max(0, female.protocolStability - 8);
              return `${female?.name ?? '一名特工'} 被写进了伪造报告，监管暂时松手，但协议负担更重了`;
            }
          },
          {
            label: '拒绝交换，保持沉默',
            effectText: '资金 +2，暴露风险 +9。',
            apply: () => {
              this.money += 2;
              this.exposureRisk = Math.min(100, this.exposureRisk + 9);
              return '你保住了真实档案，但委员会也因此开始怀疑实验室是否另有隐情';
            }
          }
        ]
      });
    }
    if (this.money <= 10) {
      events.push({
        id: `cash-${this.day}`,
        title: '维护预算告急',
        body: '底层培养槽和情感拟态模块的账单同时压了上来。财务建议你立刻做取舍，否则公司会把资源调去别的仿生人项目。',
        source: 'balance',
        options: [
          { label: '接受高息周转', effectText: '资金 +12，暴露风险 +5。', apply: () => { this.money += 12; this.exposureRisk = Math.min(100, this.exposureRisk + 5); return '你通过灰色渠道拿到了一笔短周转，但也留下了新的暴露痕迹'; } },
          { label: '压缩维护预算', effectText: '资金 +6，随机两名角色健康 -5。', apply: () => { this.money += 6; this.randomCards(2).forEach((card) => { card.health = Math.max(0, card.health - 5); }); return '实验室把维保压到了最低线，账面好看了些，但个体状态明显下滑'; } },
          { label: '出售一份样本额度', effectText: '若有样本则样本 -1，资金 +9。', apply: () => { if (this.samples.length) this.samples.shift(); this.money += 9; return '公司卖掉了一份外部父系额度，暂时换来了喘息空间'; } }
        ]
      });
    }
    if (averageFemaleLoyalty <= 50 && females.length) {
      events.push({
        id: `loyalty-${this.day}`,
        title: '情感协议波动',
        body: '多名女性仿生人的情感协议开始一起走低。制造公司担心她们在赏金猎人和高压目标之间形成不可控偏移，但强行修补也会带来代价。',
        source: 'balance',
        options: [
          {
            label: '集中做情感安抚',
            effectText: '资金 -8，所有女性忠诚 +8，暴露风险 +2，并形成 2 天情感校准。',
            apply: () => {
              this.money = Math.max(0, this.money - 8);
              females.forEach((card) => { card.loyalty = Math.min(card.maxLoyalty, card.loyalty + 8); });
              this.exposureRisk = Math.min(100, this.exposureRisk + 2);
              this.addTimedEffect({ id: 'morale-cycle', title: '情感校准', description: '女性忠诚每日+2 委托风险-2', daysRemaining: 2, loyaltyDaily: 2, missionRiskMod: -2 });
              return '你让实验室全面放缓节奏，接下来几天女性特工的情绪会更稳定一些';
            }
          },
          {
            label: '缩减委托强度，优先稳住现役',
            effectText: '资金 -4，执行中女性忠诚 +6、体力 +8，暴露风险 +4。',
            apply: () => {
              this.money = Math.max(0, this.money - 4);
              females.filter((card) => !!card.mission).forEach((card) => {
                card.loyalty = Math.min(card.maxLoyalty, card.loyalty + 6);
                card.stamina = Math.min(card.maxStamina, card.stamina + 8);
              });
              this.exposureRisk = Math.min(100, this.exposureRisk + 4);
              return '你默许一部分委托降速处理，现役特工稳了一些，但网络节奏也因此露出缝隙';
            }
          },
          {
            label: '注入硬性协议补丁',
            effectText: '一名低忠诚女性忠诚 +16，健康 -8，协议稳定 -6。',
            apply: () => {
              const female = lowLoyaltyFemale ?? this.randomFemale((card) => !card.mission && !card.pregnancy);
              if (female) {
                female.loyalty = Math.min(female.maxLoyalty, female.loyalty + 16);
                female.health = Math.max(0, female.health - 8);
                female.protocolStability = Math.max(0, female.protocolStability - 6);
              }
              return `${female?.name ?? '一名特工'} 被强行打了补丁，短期服从度回升，但身体和协议都多了一层裂纹`;
            }
          }
        ]
      });
    }
    if (this.exposureRisk >= 55) {
      events.push({
        id: `exposure-${this.day}`,
        title: '稽查压力逼近',
        body: '市政与警方的联合稽查开始关注制造公司的仿生人流向。你必须决定是花钱压下去，还是接受更冒险的处理方案。',
        source: 'balance',
        options: [
          { label: '花钱封口', effectText: '资金 -12，暴露风险 -14。', apply: () => { this.money = Math.max(0, this.money - 12); this.exposureRisk = Math.max(0, this.exposureRisk - 14); return '公司用一笔不太体面的费用压住了稽查问询'; } },
          { label: '删改记录并让特工背锅', effectText: '随机一名女性忠诚 -10，暴露风险 -18。', apply: () => { const female = this.randomFemale((card) => !card.mission); if (female) female.loyalty = Math.max(0, female.loyalty - 10); this.exposureRisk = Math.max(0, this.exposureRisk - 18); return `${female?.name ?? '一名女性特工'} 被迫承担了删除记录后的后果，实验室暂时脱困`; } },
          { label: '维持常规伪装', effectText: '资金 -4，暴露风险 -6，随机一名角色健康 -4。', apply: () => { this.money = Math.max(0, this.money - 4); this.exposureRisk = Math.max(0, this.exposureRisk - 6); const card = this.randomCard(); if (card) card.health = Math.max(0, card.health - 4); return '你保住了外层伪装，但内部运转被硬生生压出了一道伤口'; } }
        ]
      });
    }
    if (decliningCards.length >= 2 || averageHealth <= 68) {
      events.push({
        id: `aging-${this.day}`,
        title: '寿命模型警报',
        body: '寿命模型发出预警：部分个体的磨损速度开始超出制造公司原本的寿命曲线。你可以花钱拉回一口气，也可以把磨损继续压给现役系统。',
        source: 'balance',
        options: [
          {
            label: '更换维生组件',
            effectText: '资金 -10，衰退/老化个体健康 +8，老化磨损 -2，并进入 3 天强化维保。',
            apply: () => {
              this.money = Math.max(0, this.money - 10);
              decliningCards.forEach((card) => {
                card.health = Math.min(card.maxHealth, card.health + 8);
                card.agingWear = Math.max(0, card.agingWear - 2);
              });
              this.addTimedEffect({ id: 'maintenance-cycle', title: '强化维保', description: '每日恢复+1 繁育费用+2', daysRemaining: 3, healthRecoveryDaily: 1, breedingCostMod: 2 });
              return '你花钱把最危险的寿命曲线拉回来一点，但接下来几天实验室也会更偏向维保而不是扩张';
            }
          },
          {
            label: '拆旧机给核心血线续命',
            effectText: '资金 -4，一名衰退个体健康 +12，另一名随机角色健康 -4。',
            apply: () => {
              this.money = Math.max(0, this.money - 4);
              if (agingCard) agingCard.health = Math.min(agingCard.maxHealth, agingCard.health + 12);
              const collateral = this.randomCard();
              if (collateral && collateral.id !== agingCard?.id) collateral.health = Math.max(0, collateral.health - 4);
              return `${agingCard?.name ?? '一名老化个体'} 得到优先保养，但实验室把代价转嫁给了别的培养槽`;
            }
          },
          {
            label: '继续压榨当前排程',
            effectText: '资金 +6，衰退/老化个体健康 -5，暴露风险 +3。',
            apply: () => {
              this.money += 6;
              decliningCards.forEach((card) => { card.health = Math.max(0, card.health - 5); });
              this.exposureRisk = Math.min(100, this.exposureRisk + 3);
              return '账面短期变好看了，但老化个体的状态正在用更快的速度塌陷';
            }
          }
        ]
      });
    }
    if (this.day >= 7 && this.samples.length === 0) {
      events.push({
        id: `sample-gap-${this.day}`,
        title: '父系样本断档',
        body: '近期委托没有带回新的授权样本，繁育线开始出现空窗。公司催你尽快补上父系来源，否则血线规划会被迫停摆。',
        source: 'balance',
        options: [
          {
            label: '走法务采购一份合规样本',
            effectText: '资金 -8，获得 1 份 B 级样本，暴露风险 +2。',
            apply: () => {
              this.money = Math.max(0, this.money - 8);
              this.samples.unshift(this.createSample('外部样本-法务购入', '合规代理渠道', 'B', ['低调', '可用父系']));
              this.exposureRisk = Math.min(100, this.exposureRisk + 2);
              return '你通过合规代理补到了一份样本，虽然质量一般，但至少没让繁育线彻底断掉';
            }
          },
          {
            label: '换取一份高风险授权样本',
            effectText: '获得 1 份 A 级样本，暴露风险 +6，一名女性忠诚 -5。',
            apply: () => {
              this.samples.unshift(this.createSample('外部样本-灰域回收', '争议客户链路', 'A', ['高魅力', '波动来源']));
              this.exposureRisk = Math.min(100, this.exposureRisk + 6);
              const female = idleFemale ?? this.randomFemale((card) => !card.pregnancy);
              if (female) female.loyalty = Math.max(0, female.loyalty - 5);
              return `${female?.name ?? '一名特工'} 配合完成了灰域回收，实验室拿到样本，但也留下了更难抹掉的痕迹`;
            }
          },
          {
            label: '暂停一轮父系计划',
            effectText: '资金 +4，所有女性忠诚 -3。',
            apply: () => {
              this.money += 4;
              females.forEach((card) => { card.loyalty = Math.max(0, card.loyalty - 3); });
              return '你用暂停繁育换来一笔预算回流，但实验室内部对未来方向的信心明显下滑';
            }
          }
        ]
      });
    }
    if (pregnantFemale && Phaser.Math.Between(1, 100) <= 20) {
      events.push({
        id: `pregnancy-${this.day}-${pregnantFemale.id}`,
        title: '孕程波动',
        body: '孕程监测发现，一名怀孕中的女性仿生人出现了不稳定波段。研发组说可以强行压平，也可以让她停用更多设备维持自然适应。',
        source: 'balance',
        options: [
          {
            label: '投入额外监护',
            effectText: '资金 -6，该个体健康 +4，孕程风险减压。',
            apply: () => {
              pregnantFemale.health = Math.min(pregnantFemale.maxHealth, pregnantFemale.health + 4);
              this.money = Math.max(0, this.money - 6);
              return `${pregnantFemale.name} 得到了额外监护，孕程暂时稳定，但实验室又多烧了一笔钱`;
            }
          },
          {
            label: '切换保守培养模式',
            effectText: '资金 -2，该个体体力 -6，暴露风险 -3。',
            apply: () => {
              pregnantFemale.stamina = Math.max(0, pregnantFemale.stamina - 6);
              this.money = Math.max(0, this.money - 2);
              this.exposureRisk = Math.max(0, this.exposureRisk - 3);
              return `${pregnantFemale.name} 被转入更保守的培养模式，风险下降了些，但恢复进度也更慢`;
            }
          },
          {
            label: '不额外处理，继续观察',
            effectText: '无资金成本，该个体健康 -5。',
            apply: () => {
              pregnantFemale.health = Math.max(0, pregnantFemale.health - 5);
              return `${pregnantFemale.name} 被要求自行撑过波动窗口，实验室省下了成本，但她的状态明显变差`;
            }
          }
        ]
      });
    }
    if (Phaser.Math.Between(1, 100) <= 12) {
      events.push({
        id: `easter-${this.day}-${this.log.length}`,
        title: '电子羊演示机',
        body: '制造公司仓库里翻出一台旧电子羊演示机。公关部觉得这玩意能唤起公众同情，但研发部更想把里面的稳定算法拆下来给新型女仿生人做伪装层。',
        source: 'random',
        options: [
          { label: '拿去做合法化展演', effectText: '资金 +5，暴露风险 +3。', apply: () => { this.money += 5; this.exposureRisk = Math.min(100, this.exposureRisk + 3); return '电子羊成了展演焦点，现金流有所改善，但也吸引了额外目光'; } },
          { label: '拆机回收算法', effectText: '随机一名女性稳定 +4，资金 -2。', apply: () => { const female = this.randomFemale(() => true); if (female) female.visibleStats.stability = Phaser.Math.Clamp(female.visibleStats.stability + 4, 0, 100); this.money = Math.max(0, this.money - 2); return `${female?.name ?? '一名女性仿生人'} 接上了旧算法，稳定性稍有提升`; } },
          { label: '低调封存', effectText: '无收益，暴露风险 -2。', apply: () => { this.exposureRisk = Math.max(0, this.exposureRisk - 2); return '你把演示机重新封进仓库，至少没让它继续惹来额外注意'; } }
        ]
      });
    }
    if (Phaser.Math.Between(1, 100) <= 10) {
      events.push({
        id: `archive-reel-${this.day}-${this.cards.length}`,
        title: '旧广告母带',
        body: '档案室里翻出一卷老宣传片母带，里面是制造公司早年用来宣传“共情型仿生人”的广告。法务想拿去做合法化舆论试水，研发则想回收其中的情绪脚本。',
        source: 'random',
        options: [
          {
            label: '剪成对外宣传短片',
            effectText: '资金 +4，暴露风险 +4。',
            apply: () => {
              this.money += 4;
              this.exposureRisk = Math.min(100, this.exposureRisk + 4);
              return '旧母带勾起了一些公众同情，但也让赏金猎人更容易重新盯上这家公司';
            }
          },
          {
            label: '拆出情绪脚本做内训',
            effectText: '随机一名女性温柔 +4，资金 -3。',
            apply: () => {
              const female = this.randomFemale(() => true);
              if (female) female.visibleStats.gentleness = Phaser.Math.Clamp(female.visibleStats.gentleness + 4, 0, 100);
              this.money = Math.max(0, this.money - 3);
              return `${female?.name ?? '一名女性仿生人'} 吸收了旧宣传脚本，情感陪同表现更柔和了一些`;
            }
          },
          {
            label: '重新封存，不留记录',
            effectText: '资金 -1，暴露风险 -2。',
            apply: () => {
              this.money = Math.max(0, this.money - 1);
              this.exposureRisk = Math.max(0, this.exposureRisk - 2);
              return '你把母带重新塞回了档案箱，至少它暂时不会在错误的时候跳出来惹祸';
            }
          }
        ]
      });
    }
    if (Phaser.Math.Between(1, 100) <= 8) {
      events.push({
        id: `midnight-radio-${this.day}-${this.log.length}`,
        title: '午夜诗歌电台',
        body: '实验室的内网广播忽然播起一段关于电子羊和雨夜霓虹的诗。研发部认为这是无害彩蛋，公关部却觉得它很适合拿去制造公众同情。',
        source: 'random',
        options: [
          {
            label: '拿去试做深夜广播',
            effectText: '资金 +3，暴露风险 +2。',
            apply: () => {
              this.money += 3;
              this.exposureRisk = Math.min(100, this.exposureRisk + 2);
              return '那段诗意广播确实吸引了一点同情，但也让公司在外部多了一丝可追踪的轮廓';
            }
          },
          {
            label: '保留为内部安抚协议',
            effectText: '随机一名女性忠诚 +6，资金 -2。',
            apply: () => {
              const female = this.randomFemale(() => true);
              if (female) female.loyalty = Math.min(female.maxLoyalty, female.loyalty + 6);
              this.money = Math.max(0, this.money - 2);
              return `${female?.name ?? '一名女性仿生人'} 对那段广播产生了共鸣，协议情绪暂时变得更平稳`;
            }
          },
          {
            label: '立刻静音归档',
            effectText: '暴露风险 -1，一名女性忠诚 -3。',
            apply: () => {
              const female = this.randomFemale(() => true);
              if (female) female.loyalty = Math.max(0, female.loyalty - 3);
              this.exposureRisk = Math.max(0, this.exposureRisk - 1);
              return '你果断掐掉了这段广播，安全上稳了些，但实验室里有些人显然不太高兴';
            }
          }
        ]
      });
    }
    return events;
  }

  private randomCard(): LabCard | null {
    return this.cards.length ? Phaser.Utils.Array.GetRandom(this.cards) : null;
  }

  private randomCards(count: number): LabCard[] {
    return Phaser.Utils.Array.Shuffle([...this.cards]).slice(0, count);
  }

  private randomFemale(predicate: (card: LabCard) => boolean): LabCard | null {
    const pool = this.cards.filter((card) => card.sex === '女' && predicate(card));
    return pool.length ? Phaser.Utils.Array.GetRandom(pool) : null;
  }

  private motherBlockedReason(card: LabCard): string | null {
    if (this.motherId === card.id) return null;
    if (card.sex !== '女') return '非女性';
    if (card.lifeStage === 'infant' || card.lifeStage === 'growth') return '未成熟';
    if (card.mission) return '任务中';
    if (card.pregnancy) return '怀孕中';
    if (card.stamina < 50) return '体力低';
    if (card.health < 60) return '健康低';
    return null;
  }

  private fatherBlockedReason(card: LabCard): string | null {
    if (this.fatherCardId === card.id) return null;
    if (card.sex !== '男') return '非男性';
    if (card.lifeStage === 'infant' || card.lifeStage === 'growth') return '未成熟';
    if (card.mission) return '任务中';
    if (card.pregnancy) return '怀孕中';
    return null;
  }

  private assignmentBlockedReason(card: LabCard): string | null {
    if (this.assignmentCardId === card.id) return null;
    if (card.sex !== '女') return '非女性';
    if (card.lifeStage === 'infant' || card.lifeStage === 'growth') return '未成熟';
    if (card.mission) return '任务中';
    if (card.pregnancy) return '怀孕中';
    if (card.stamina < 35) return '体力低';
    if (card.health < 45) return '健康低';
    if (card.loyalty < 35) return '忠诚低';
    return null;
  }

  private filteredCards(): LabCard[] {
    if (this.rosterTab === 'female') return this.cards.filter((card) => card.sex === '女');
    if (this.rosterTab === 'male') return this.cards.filter((card) => card.sex === '男');
    return this.cards;
  }

  private scoreLabel(key: StatKey, value: number): string {
    return `${STAT_LABELS[key]} ${value}`;
  }

  private cardSummaryLine(card: LabCard): string {
    const role = card.isPlayerSelf ? '自己' : `${card.sex}性`;
    const base = `${role} | ${LIFE_STAGE_LABELS[card.lifeStage]} | ${card.ageDays}天 | 健康${card.health} | 体力${card.stamina}`;
    return card.sex === '女' ? `${base} | 忠诚${card.loyalty}` : `${base} | 遗传潜力${card.bloodlineValue}`;
  }

  private cardStateLabel(card: LabCard): string {
    if (card.pregnancy) return `怀孕中(${card.pregnancy.daysRemaining}天)`;
    if (card.mission) return `潜入中(${card.mission.daysRemaining}天 风险${Math.round(card.mission.failureRisk)}%)`;
    return '空闲';
  }

  private projectedTendency(stats: VisibleStats): string[] {
    const ordered = [...STAT_KEYS].sort((left, right) => stats[right] - stats[left]);
    return ordered.slice(0, 2).map((key) => STAT_LABELS[key]);
  }

  private positiveTraits(card: LabCard): TraitEntry[] {
    return this.combinedTraits(card).filter((trait) => trait.polarity === 'positive');
  }

  private negativeTraits(card: LabCard): TraitEntry[] {
    return this.combinedTraits(card).filter((trait) => trait.polarity === 'negative');
  }

  private tierLabel(tier: number, verbose = false): string {
    const label = ['I', 'II', 'III', 'IV'][Math.max(0, Math.min(3, tier - 1))] ?? 'I';
    return verbose ? `等级 ${label}` : ` ${label}`;
  }

  private negativeTraitText(card: LabCard): string {
    const traits = this.negativeTraits(card).slice(0, 3);
    if (!traits.length) return '无';
    return traits.map((trait) => `${trait.name}${this.tierLabel(trait.tier)}`).join('、');
  }

  private canSetMother(card: LabCard): boolean { return card.sex === '女' && this.isBreedingReady(card); }
  private toggleMother(id: string): void { this.motherId = this.motherId === id ? null : id; this.render(); }
  private canToggleMother(card: LabCard): boolean { return this.motherId === card.id || this.canSetMother(card); }
  private canSetFather(card: LabCard): boolean { return card.sex === '男' && !card.mission && !card.pregnancy && card.lifeStage !== 'infant' && card.lifeStage !== 'growth'; }
  private toggleFather(id: string): void { if (this.fatherCardId === id) this.fatherCardId = null; else { this.fatherCardId = id; this.fatherSampleId = null; } this.render(); }
  private canToggleFather(card: LabCard): boolean { return this.fatherCardId === card.id || this.canSetFather(card); }
  private setFatherSample(id: string): void { if (this.fatherSampleId === id) this.fatherSampleId = null; else { this.fatherSampleId = id; this.fatherCardId = null; } this.render(); }
  private canSetAssignment(card: LabCard): boolean { return card.sex === '女' && this.isMissionReady(card); }
  private toggleAssignment(id: string): void { this.assignmentCardId = this.assignmentCardId === id ? null : id; this.render(); }
  private canRest(card: LabCard): boolean { return !card.mission && (card.stamina < card.maxStamina || card.health < card.maxHealth || (card.sex === '女' && card.loyalty < card.maxLoyalty)) && this.money >= 4; }

  private restCard(id: string): void {
    const card = this.card(id);
    if (!card || !this.canRest(card)) return;
    card.stamina = Math.min(card.maxStamina, card.stamina + 28);
    card.health = Math.min(card.maxHealth, card.health + 6);
    if (card.sex === '女') card.loyalty = Math.min(card.maxLoyalty, card.loyalty + 8);
    this.money -= 4;
    this.pushLog(`${card.name} 完成休整，体力和状态有所恢复。`);
    this.render();
  }

  private canMedicate(card: LabCard): boolean { return !card.mission && card.health < card.maxHealth && this.money >= 6; }
  private medicateCard(id: string): void {
    const card = this.card(id);
    if (!card || !this.canMedicate(card)) return;
    card.health = Math.min(card.maxHealth, card.health + 14);
    this.money -= 6;
    this.pushLog(`${card.name} 接受了医护维护，健康明显回升。`);
    this.render();
  }

  private retireCard(id: string): void {
    const card = this.card(id);
    if (!card) return;
    if (card.isPlayerSelf) return;
    this.cards = this.cards.filter((entry) => entry.id !== id);
    if (this.motherId === id) this.motherId = null;
    if (this.fatherCardId === id) this.fatherCardId = null;
    if (this.assignmentCardId === id) this.assignmentCardId = null;
    this.money += 5;
    this.pushLog(`${card.name} 已从现役名册中移除，回收资金 5。`);
    this.render();
  }

  private renameCard(id: string): void {
    const card = this.card(id);
    if (!card || !card.isPlayerSelf) return;
    const nextName = window.prompt('输入新的名字', card.name)?.trim();
    if (!nextName) return;
    const safeName = nextName.slice(0, 12);
    if (safeName === card.name) return;
    card.name = safeName;
    this.pushLog(`“自己”的识别名已更新为 ${safeName}。`);
    this.render();
  }

  private canAssign(targetId: string): boolean {
    const operative = this.card(this.assignmentCardId);
    const target = this.target(targetId);
    return !!operative && !!target && !target.assignedCardId && this.isMissionReady(operative);
  }

  private assignTarget(targetId: string): void {
    const operative = this.card(this.assignmentCardId);
    const target = this.target(targetId);
    if (!operative || !target || !this.canAssign(targetId)) return;
    const risk = this.computeMissionRisk(operative, target);
    operative.stamina = Math.max(0, operative.stamina - 20);
    operative.mission = { targetId: target.id, targetLabel: `${target.name} · ${target.title}`, purpose: target.purpose, daysRemaining: target.duration, failureRisk: risk, targetCharisma: target.targetCharisma, pressure: target.pressure };
    target.assignedCardId = operative.id;
    target.daysRemaining = target.duration;
    target.failureRisk = risk;
    this.assignmentCardId = null;
    this.pushLog(`${operative.name} 已前往 ${target.name} 身边执行 ${target.purpose}。`);
    this.render();
  }

  private unlockClue(targetId: string, clueId: string): void {
    const target = this.target(targetId);
    const clue = target?.clues.find((entry) => entry.id === clueId);
    if (!target || !clue || clue.unlocked || this.money < clue.cost) return;
    this.money -= clue.cost;
    clue.unlocked = true;
    this.pushLog(`已解锁 ${target.name} 的一条委托线索。`);
    this.render();
  }

  private refreshTarget(targetId: string): void {
    const index = this.targets.findIndex((entry) => entry.id === targetId);
    if (index < 0 || this.targets[index].assignedCardId || this.money < 4) return;
    this.money -= 4;
    this.targets[index] = this.createMissionTarget();
    this.pushLog('已刷新一项新的潜入委托。');
    this.render();
  }
  private breedingSummary(): BreedingSummary {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    const sample = this.sample(this.fatherSampleId);
    const cost = Math.max(6, 12 + (sample?.quality === 'S' ? 4 : sample?.quality === 'A' ? 2 : 0) + this.sumActiveEffect('breedingCostMod'));
    if (!mother || (!father && !sample)) {
      return {
        canBreed: false,
        cost,
        successBand: '低',
        positiveRange: [0, 1],
        negativeRange: [0, 1],
        purebloodChance: 0,
        degradationChance: 0,
        projectedChildTendency: ['先完成父母选择'],
        purebloodFactors: [],
        degradationFactors: [],
        startScore: 0,
        riskBoost: 0
      };
    }
    const bloodline = father ? this.computeBloodlineRisk(mother, father) : { band: '低' as RiskBand, detail: '外部样本视为外源血线。', negativeBoost: 0 };
    const fatherStats = father?.visibleStats ?? this.computeStats(sample!.visibleGenome);
    const familyTraits = [
      ...this.positiveTraits(mother),
      ...(father ? this.positiveTraits(father) : [])
    ];
    const familyNegative = [
      ...this.negativeTraits(mother),
      ...(father ? this.negativeTraits(father) : [])
    ];
    const heredity = Math.max(0, this.pairValue(mother.breedingGenome.HER) + this.pairValue((father?.breedingGenome ?? sample!.breedingGenome).HER));
    const topStatAverage = Math.round(
      [...STAT_KEYS]
        .map((key) => Math.round((mother.visibleStats[key] + fatherStats[key]) / 2))
        .sort((left, right) => right - left)
        .slice(0, 3)
        .reduce((sum, value) => sum + value, 0) / 3
    );
    const positiveScore =
      Math.max(0, topStatAverage - 55) +
      this.positiveTraitWeight(familyTraits) * 3 +
      heredity * 2 -
      bloodline.negativeBoost * 9 -
      this.negativeTraitWeight(familyNegative) * 2;
    const negativeScore =
      bloodline.negativeBoost * 18 +
      this.negativeTraitWeight(familyNegative) * 3 +
      Math.max(0, 55 - Math.round((mother.visibleStats.constitution + fatherStats.constitution) / 2)) / 2 +
      Math.max(0, 55 - Math.round((mother.visibleStats.stability + fatherStats.stability) / 2)) / 2;
    const successScore = positiveScore - negativeScore / 3 + Math.floor((mother.health - 50) / 6) + Math.floor((mother.stamina - 50) / 8);
    const successBand: RiskBand = successScore >= 32 ? '高' : successScore >= 18 ? '中' : successScore >= 6 ? '低' : '极高';
    const purebloodChance = this.computePurebloodChance(mother, father, sample, positiveScore, negativeScore, bloodline.negativeBoost);
    const degradationChance = this.computeDegradationChance(mother, father, sample, positiveScore, negativeScore, bloodline.negativeBoost);
    const positiveRange: [number, number] =
      positiveScore >= 48 ? [3, 4] :
      positiveScore >= 30 ? [2, 3] :
      positiveScore >= 18 ? [1, 2] :
      [0, 1];
    const negativeRange: [number, number] =
      degradationChance >= 28 ? [2, 4] :
      degradationChance >= 16 ? [1, 3] :
      degradationChance >= 6 ? [1, 2] :
      [0, 1];
    const purebloodFactors = [
      topStatAverage >= 76 ? '主属性底子很高' : topStatAverage >= 66 ? '主属性底子不错' : '',
      heredity >= 4 ? '遗传稳定度较高' : '',
      purebloodChance > 0 && this.purebloodCarrierWeight(mother.legacyGenome) + this.purebloodCarrierWeight(father?.legacyGenome ?? sample!.legacyGenome) > 0 ? '血线已带有隐藏纯血种子' : '',
      this.positiveTraitWeight(familyTraits) >= 8 ? '正面特质方向比较集中' : ''
    ].filter(Boolean);
    const degradationFactors = [
      bloodline.negativeBoost >= 2 ? '近亲压力较重' : bloodline.negativeBoost === 1 ? '存在祖辈重叠' : '',
      this.negativeTraitWeight(familyNegative) >= 6 ? '坏特质已经开始累积' : this.negativeTraitWeight(familyNegative) >= 2 ? '坏特质有扩散迹象' : '',
      mother.health < 70 ? '母体当前健康储备偏低' : '',
      degradationChance > 0 && this.degradationCarrierWeight(mother.legacyGenome) + this.degradationCarrierWeight(father?.legacyGenome ?? sample!.legacyGenome) > 0 ? '血线中已潜伏劣化种子' : ''
    ].filter(Boolean);
    const canBreed = this.money >= cost && this.isBreedingReady(mother) && (!!sample || (!!father && this.canSetFather(father)));
    return {
      canBreed,
      cost,
      successBand,
      positiveRange,
      negativeRange,
      purebloodChance,
      degradationChance,
      projectedChildTendency: this.projectChildTendency(mother, father, sample),
      purebloodFactors,
      degradationFactors,
      startScore: successScore,
      riskBoost: bloodline.negativeBoost
    };
  }

  private startBreeding(): void {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    const sample = this.sample(this.fatherSampleId);
    const summary = this.breedingSummary();
    if (!mother || (!father && !sample) || !summary.canBreed) return;
    this.money -= summary.cost;
    mother.stamina = Math.max(0, mother.stamina - 22);
    mother.health = Math.max(0, mother.health - 4);
    const fecScore = this.pairValue(mother.breedingGenome.FEC) + this.pairValue((father?.breedingGenome ?? sample!.breedingGenome).FEC);
    const successThreshold = Phaser.Math.Clamp(42 + summary.startScore + fecScore * 3, 10, 92);
    if (Phaser.Math.Between(0, 100) > successThreshold) {
      this.pushLog(`${mother.name} 的本轮繁育未能启动：${this.breedingFailureReason(mother, father, sample, summary, fecScore)}。实验室只消耗了准备资源。`);
      this.render();
      return;
    }
    const children = this.rollChildren(mother, father, sample, summary);
    const gestationRisk: RiskBand = summary.degradationChance >= 28 ? '高' : summary.degradationChance >= 14 ? '中' : '低';
    mother.pregnancy = { children, fatherLabel: father?.name ?? sample!.name, daysRemaining: gestationRisk === '高' ? 5 : gestationRisk === '中' ? 4 : 3, gestationRisk };
    if (this.motherId === mother.id) this.motherId = null;
    if (father) father.stamina = Math.max(0, father.stamina - 12);
    if (sample) {
      sample.usesLeft -= 1;
      if (sample.usesLeft <= 0) this.samples = this.samples.filter((entry) => entry.id !== sample.id);
      this.fatherSampleId = null;
    }
    this.totalBirths += children.length;
    this.pushLog(`${mother.name} 已进入孕程。预计 ${mother.pregnancy.daysRemaining} 天后进行出生结算。`);
    this.render();
  }

  private advanceDay(): void {
    this.day += 1;
    this.resolveTimedEffects();
    const births: LabCard[] = [];
    const newbornEvents: string[] = [];
    this.cards.forEach((card) => {
      card.ageDays += 1;
      const dailyWear = this.baseWear(card) + (card.mission ? card.mission.pressure : 0) + (card.pregnancy ? 1 : 0);
      card.agingWear += dailyWear;
      if (card.mission) {
        card.stamina = Math.max(0, card.stamina - (8 + card.mission.pressure * 2));
        card.health = Math.max(0, card.health - this.healthLossOnMission(card));
        if (card.sex === '女') card.loyalty = Math.max(0, card.loyalty - this.loyaltyLoss(card));
        card.protocolStability = Math.max(0, card.protocolStability - this.protocolDrift(card));
      } else if (!card.pregnancy) {
        card.stamina = Math.min(card.maxStamina, card.stamina + 10);
        card.health = Math.min(card.maxHealth, card.health + this.passiveHealthRecovery(card));
        if (card.sex === '女') card.loyalty = Math.min(card.maxLoyalty, card.loyalty + 1);
      }
      if (card.pregnancy) {
        card.pregnancy.daysRemaining -= 1;
        card.health = Math.max(0, card.health - this.healthLossOnPregnancy(card));
        if (card.pregnancy.daysRemaining <= 0) {
          const birthOutcome = this.resolveBirth(card);
          births.push(...birthOutcome.children);
          newbornEvents.push(...birthOutcome.events);
        }
      }
      this.updateLifeStage(card);
      this.revealGrowthTraits(card);
      this.applyVisibleStateClamp(card);
    });
    this.targets.forEach((target) => {
      if (!target.assignedCardId) return;
      const operative = this.card(target.assignedCardId);
      if (!operative || !operative.mission) { this.replaceTarget(target.id); return; }
      target.daysRemaining -= 1;
      const risk = this.computeMissionRisk(operative, target);
      target.failureRisk = risk;
      operative.mission.daysRemaining = target.daysRemaining;
      operative.mission.failureRisk = risk;
      if (operative.health <= 18 || operative.stamina <= 10) {
        this.pushLog(`${operative.name} 体况不足，被迫从 ${target.name} 的委托中撤回。`);
        this.finishMission(operative, target, 'withdraw');
        return;
      }
      if (operative.sex === '女' && operative.loyalty <= 0) {
        this.pushLog(`${operative.name} 在 ${target.name} 的高压关系中出现协议失守并叛离实验室。`);
        this.exposureRisk = Math.min(100, this.exposureRisk + 22);
        this.cards = this.cards.filter((entry) => entry.id !== operative.id);
        if (this.assignmentCardId === operative.id) this.assignmentCardId = null;
        if (this.motherId === operative.id) this.motherId = null;
        this.replaceTarget(target.id);
        return;
      }
      if (operative.protocolStability < 26 && this.hasTrait(operative, 'protocolDrift') && Phaser.Math.Between(0, 100) < 16) {
        this.pushLog(`${operative.name} 因协议漂移主动切断委托，实验室额外承受了暴露压力。`);
        this.exposureRisk = Math.min(100, this.exposureRisk + 8);
        this.finishMission(operative, target, 'withdraw');
        return;
      }
      if (Phaser.Math.Between(0, 100) < risk) {
        this.pushLog(`${operative.name} 未能在 ${target.name} 的委托中达成目标，只能无果返回。`);
        this.finishMission(operative, target, 'fail');
        return;
      }
      if (target.daysRemaining <= 0) this.resolveMissionSuccess(operative, target);
    });
    if (births.length) { this.cards.unshift(...births.reverse()); this.rosterScroll = 0; }
    newbornEvents.forEach((entry) => this.pushLog(entry));
    this.pushLog(`时间推进到第 ${this.day} 天。`);
    if (this.exposureRisk >= 100) {
      this.scene.start('GameOver', { credits: this.money, sampleCount: this.samples.length, totalBreedings: this.totalBirths, totalServices: this.totalAssignments, rosterSize: this.cards.length, reason: '实验室暴露风险到达临界值，项目被强制终止。' });
      return;
    }
    this.rollLabEvent();
    this.render();
  }

  private resolveEventOption(index: number): void {
    if (!this.pendingEvent) return;
    const option = this.pendingEvent.options[index];
    if (!option) return;
    const result = option.apply();
    this.normalizeAfterEvent();
    this.pushLog(`${this.pendingEvent.title}：${result}`);
    this.pendingEvent = null;
    if (this.exposureRisk >= 100) {
      this.scene.start('GameOver', { credits: this.money, sampleCount: this.samples.length, totalBreedings: this.totalBirths, totalServices: this.totalAssignments, rosterSize: this.cards.length, reason: '实验室在事件连锁中彻底暴露，项目被强制终止。' });
      return;
    }
    this.render();
  }

  private normalizeAfterEvent(): void {
    this.cards.forEach((card) => {
      STAT_KEYS.forEach((key) => {
        card.visibleStats[key] = Phaser.Math.Clamp(card.visibleStats[key], 0, 100);
      });
      this.updateLifeStage(card);
      this.applyVisibleStateClamp(card);
      card.bloodlineValue = this.computeBloodlineValue(card.visibleStats, [...card.innateTraits, ...card.growthTraits], card.expressedDefects, card.breedingGenome);
      card.tags = this.buildTags(card.sex, card.visibleStats, [...card.innateTraits, ...card.growthTraits], card.expressedDefects);
    });
    if (this.motherId && !this.card(this.motherId)) this.motherId = null;
    if (this.fatherCardId && !this.card(this.fatherCardId)) this.fatherCardId = null;
    if (this.assignmentCardId && !this.card(this.assignmentCardId)) this.assignmentCardId = null;
    if (this.fatherSampleId && !this.sample(this.fatherSampleId)) this.fatherSampleId = null;
  }

  private addTimedEffect(effect: TemporaryEffect): void {
    this.activeEffects.push({
      ...effect,
      id: `${effect.id}-${this.day}-${this.activeEffects.length}`
    });
  }

  private sumActiveEffect(key: keyof Pick<TemporaryEffect, 'missionRiskMod' | 'exposureDaily' | 'loyaltyDaily' | 'healthRecoveryDaily' | 'breedingCostMod'>): number {
    return this.activeEffects.reduce((sum, effect) => sum + (effect[key] ?? 0), 0);
  }

  private resolveTimedEffects(): void {
    if (!this.activeEffects.length) return;
    const exposureDaily = this.sumActiveEffect('exposureDaily');
    if (exposureDaily !== 0) {
      this.exposureRisk = Phaser.Math.Clamp(this.exposureRisk + exposureDaily, 0, 100);
    }
    const loyaltyDaily = this.sumActiveEffect('loyaltyDaily');
    if (loyaltyDaily !== 0) {
      this.cards.filter((card) => card.sex === '女').forEach((card) => {
        card.loyalty = Phaser.Math.Clamp(card.loyalty + loyaltyDaily, 0, card.maxLoyalty);
      });
    }
    this.activeEffects.forEach((effect) => {
      effect.daysRemaining -= 1;
    });
    const expired = this.activeEffects.filter((effect) => effect.daysRemaining <= 0);
    this.activeEffects = this.activeEffects.filter((effect) => effect.daysRemaining > 0);
    expired.forEach((effect) => {
      this.pushLog(`持续状态“${effect.title}”结束了。`);
    });
  }

  private resolveMissionSuccess(operative: LabCard, target: MissionTarget): void {
    const reward = target.reward + (operative.visibleStats.eloquence >= 80 ? 3 : 0);
    this.money += reward;
    this.totalAssignments += 1;
    const sampleChance = Phaser.Math.Clamp(20 + this.matchScore(operative, target) * 4, 12, 82);
    if (Phaser.Math.Between(0, 100) < sampleChance) {
      this.samples.unshift(this.createSample(`回收样本-${target.name[0]}${target.title[0]}`, `${target.name} ${target.title}`, target.reward >= 15 ? 'A' : 'B', this.projectedTendency(operative.visibleStats)));
      this.pushLog(`${operative.name} 从 ${target.name} 处带回了一份授权父系样本。`);
    }
    this.pushLog(`${operative.name} 顺利完成 ${target.purpose}，实验室到账 ${reward} 资金。`);
    this.finishMission(operative, target, 'success');
  }

  private finishMission(operative: LabCard, target: MissionTarget, outcome: 'success' | 'fail' | 'withdraw'): void {
    operative.mission = null;
    if (outcome === 'fail') { this.money = Math.max(0, this.money - 3); operative.health = Math.max(0, operative.health - 3); }
    if (outcome === 'withdraw') { operative.health = Math.max(0, operative.health - 4); operative.stamina = Math.max(0, operative.stamina - 6); }
    this.replaceTarget(target.id);
  }

  private replaceTarget(targetId: string): void {
    const index = this.targets.findIndex((entry) => entry.id === targetId);
    if (index >= 0) this.targets[index] = this.createMissionTarget();
    if (this.detailTargetId === targetId) this.detailTargetId = null;
  }

  private resolveBirth(mother: LabCard): { children: LabCard[]; events: string[] } {
    const pregnancy = mother.pregnancy;
    if (!pregnancy) return { children: [], events: [] };
    mother.pregnancy = null;
    const events: string[] = [];
    const miscarriageRisk = pregnancy.gestationRisk === '极高' ? 24 : pregnancy.gestationRisk === '高' ? 12 : 4;
    if (Phaser.Math.Between(0, 100) < miscarriageRisk && mother.health < 48) {
      mother.health = Math.max(0, mother.health - 14);
      events.push(`${mother.name} 的孕程未能维持到最后，实验室只回收了少量基础资源。`);
      this.money += 4;
      return { children: [], events };
    }
    mother.health = Math.max(0, mother.health - 10);
    pregnancy.children.forEach((child) => {
      events.push(`${mother.name} 完成出生结算，${child.name} (${child.sex}性) 加入卡库。`);
      if (this.negativeTraits(child).length) events.push(`${child.name} 初始负面特质: ${this.negativeTraits(child).map((trait) => `${trait.name}${this.tierLabel(trait.tier)}`).join('、')}。`);
      if (this.positiveTraits(child).length) events.push(`${child.name} 先天特质: ${this.positiveTraits(child).map((trait) => `${trait.name}${this.tierLabel(trait.tier)}`).join('、')}。`);
    });
    return { children: pregnancy.children, events };
  }
  private createAdultCard(name: string, sex: Sex, generation: number, ageDays: number, statProfile: Record<StatKey, 'strong' | 'good' | 'balanced' | 'weak'>, breedingProfile: Record<BreedingGeneKey, 'strong' | 'good' | 'balanced' | 'weak'>, defectBias: 'low' | 'medium' | 'high', motherId: string | null = null, fatherId: string | null = null, isPlayerSelf = false): LabCard {
    const visibleGenome = this.makeVisibleGenome(statProfile);
    const breedingGenome = this.makeBreedingGenome(breedingProfile);
    const defectGenome = this.makeDefectGenome(defectBias);
    const legacyGenome = this.makeLegacyGenome(isPlayerSelf ? 'starter-strong' : defectBias === 'low' ? 'starter-good' : defectBias === 'medium' ? 'starter-mid' : 'starter-risk');
    const card = this.createCardBase(name, sex, generation, ageDays, motherId, fatherId, visibleGenome, breedingGenome, defectGenome, legacyGenome);
    card.isPlayerSelf = isPlayerSelf;
    this.revealGrowthTraits(card);
    return card;
  }

  private createChildCard(mother: LabCard, father: LabCard | null, sample: SampleCard | null, generation: number, summary: BreedingSummary): LabCard[] {
    const fatherGenome = father?.visibleGenome ?? sample!.visibleGenome;
    const fatherBreeding = father?.breedingGenome ?? sample!.breedingGenome;
    const fatherDefects = father?.defectGenome ?? sample!.defectGenome;
    const fatherId = father?.id ?? null;
    const makeOne = (): LabCard => {
      const sex: Sex = Phaser.Math.Between(0, 1) === 0 ? '女' : '男';
      const genome = {} as VisibleGenome;
      const breeding = {} as BreedingGenome;
      const defects = {} as DefectGenome;
      STAT_KEYS.forEach((key) => { genome[key] = mother.visibleGenome[key].map((pair, index) => this.inheritGenePair(pair, fatherGenome[key][index])) as VisibleGenome[StatKey]; });
      BREEDING_GENE_KEYS.forEach((key) => { breeding[key] = this.inheritSimplePair(mother.breedingGenome[key], fatherBreeding[key]); });
      DEFECT_KEYS.forEach((key) => { defects[key] = this.inheritDefectPair(mother.defectGenome[key], fatherDefects[key], summary.riskBoost); });
      const legacyGenome = this.inheritLegacyGenome(mother, father, sample, genome, breeding, summary.riskBoost);
      const child = this.createCardBase(this.generateName(sex, genome, this.nextId++), sex, generation, 0, mother.id, fatherId, genome, breeding, defects, legacyGenome);
      this.applyFamilyTraitInheritance(child, mother, father, sample, summary.riskBoost);
      return child;
    };
    const children = [makeOne()];
    const twinChance = this.pairValue(mother.breedingGenome.VAR) + this.pairValue(fatherBreeding.VAR) >= 5 ? 3 : 2;
    if (Phaser.Math.Between(0, 100) < twinChance) children.push(makeOne());
    return children;
  }

  private rollChildren(mother: LabCard, father: LabCard | null, sample: SampleCard | null, summary: BreedingSummary): LabCard[] { return this.createChildCard(mother, father, sample, Math.max(mother.generation, father?.generation ?? mother.generation) + 1, summary); }

  private createPlayerSelf(): LabCard {
    const randomTier = (): 'strong' | 'good' | 'balanced' | 'weak' => Phaser.Utils.Array.GetRandom(['strong', 'good', 'balanced', 'weak']);
    const statProfile = {} as Record<StatKey, 'strong' | 'good' | 'balanced' | 'weak'>;
    const breedingProfile = {} as Record<BreedingGeneKey, 'strong' | 'good' | 'balanced' | 'weak'>;
    STAT_KEYS.forEach((key) => { statProfile[key] = randomTier(); });
    BREEDING_GENE_KEYS.forEach((key) => { breedingProfile[key] = randomTier(); });
    const card = this.createAdultCard('自己', '男', 1, Phaser.Math.Between(26, 38), statProfile, breedingProfile, 'low', null, null, true);
    card.lifespanPotential = 9999;
    card.agingWear = 0;
    card.lifeStage = 'mature';
    card.tags = ['自持锚点', ...card.tags.filter((tag) => tag !== '优良父系')].slice(0, 3);
    return card;
  }

  private createCardBase(name: string, sex: Sex, generation: number, ageDays: number, motherId: string | null, fatherId: string | null, visibleGenome: VisibleGenome, breedingGenome: BreedingGenome, defectGenome: DefectGenome, legacyGenome: LegacyGenome): LabCard {
    const visibleStats = this.computeStats(visibleGenome);
    const expressedDefects = this.evaluateDefects(defectGenome, visibleStats);
    const innateTraits = this.generateInnateTraits(visibleStats, expressedDefects, breedingGenome, legacyGenome);
    const pendingGrowthTraits = this.generateGrowthTraits(visibleStats, breedingGenome, expressedDefects, legacyGenome);
    const statsWithTraits = this.applyTraitEffects(visibleStats, [...innateTraits]);
    const healthBase = Phaser.Math.Clamp(statsWithTraits.constitution + 10, 40, 100);
    const card: LabCard = {
      id: `card-${Phaser.Math.RND.uuid().slice(0, 8)}`,
      name,
      sex,
      isPlayerSelf: false,
      generation,
      ageDays,
      lifeStage: 'mature',
      stamina: ageDays >= ADULT_MISSION_THRESHOLD ? 78 : 0,
      maxStamina: 100,
      health: healthBase,
      maxHealth: 100,
      loyalty: sex === '女' ? 72 : 0,
      maxLoyalty: sex === '女' ? 100 : 0,
      bloodlineValue: 0,
      visibleStats: statsWithTraits,
      visibleGenome,
      breedingGenome,
      defectGenome,
      expressedDefects,
      legacyGenome,
      innateTraits,
      growthTraits: [],
      pendingGrowthTraits,
      tags: [],
      motherId,
      fatherId,
      grandparentIds: this.collectGrandparents(motherId, fatherId),
      lifespanPotential: this.computeLifespan(statsWithTraits.constitution, innateTraits, expressedDefects),
      agingWear: 0,
      protocolStability: Phaser.Math.Clamp(55 + Math.floor((statsWithTraits.stability - 50) / 2) + this.pairValue(breedingGenome.MND) * 4 - this.negativeTraitWeight(innateTraits), 25, 100),
      mission: null,
      pregnancy: null
    };
    this.updateLifeStage(card);
    card.bloodlineValue = this.computeBloodlineValue(statsWithTraits, innateTraits, expressedDefects, breedingGenome);
    card.tags = this.buildTags(sex, statsWithTraits, innateTraits, expressedDefects);
    return card;
  }

  private makeVisibleGenome(profile: Record<StatKey, 'strong' | 'good' | 'balanced' | 'weak'>): VisibleGenome {
    const genome = {} as VisibleGenome;
    STAT_KEYS.forEach((key) => { genome[key] = [0, 1, 2, 3].map(() => this.randomGenePair(profile[key])) as VisibleGenome[StatKey]; });
    return genome;
  }

  private makeBreedingGenome(profile: Record<BreedingGeneKey, 'strong' | 'good' | 'balanced' | 'weak'>): BreedingGenome {
    const genome = {} as BreedingGenome;
    BREEDING_GENE_KEYS.forEach((key) => { genome[key] = this.randomGenePair(profile[key]); });
    return genome;
  }

  private makeLegacyGenome(profile: 'starter-strong' | 'starter-good' | 'starter-mid' | 'starter-risk' | 'sample-B' | 'sample-A' | 'sample-S'): LegacyGenome {
    const pureChance = profile === 'starter-strong' ? 20 : profile === 'starter-good' ? 12 : profile === 'sample-S' ? 18 : profile === 'sample-A' ? 10 : 4;
    const degradeChance = profile === 'starter-risk' ? 18 : profile === 'starter-mid' ? 10 : profile === 'sample-B' ? 10 : 4;
    const pureblood: PurebloodPair = [Phaser.Math.Between(0, 100) < pureChance ? 'P' : 'N', Phaser.Math.Between(0, 100) < pureChance ? 'P' : 'N'];
    const degradation: DegradationPair = [Phaser.Math.Between(0, 100) < degradeChance ? 'D' : 'N', Phaser.Math.Between(0, 100) < degradeChance ? 'D' : 'N'];
    return { pureblood, degradation };
  }

  private makeDefectGenome(bias: 'low' | 'medium' | 'high'): DefectGenome {
    const genome = {} as DefectGenome;
    DEFECT_KEYS.forEach((key) => {
      const chance = defectFamilyBias[bias];
      genome[key] = [Phaser.Math.Between(0, 100) < chance ? 'r' : 'R', Phaser.Math.Between(0, 100) < chance ? 'r' : 'R'];
    });
    return genome;
  }

  private randomGenePair(tier: 'strong' | 'good' | 'balanced' | 'weak'): GenePair {
    const pool = genePoolByTier[tier];
    return [Phaser.Utils.Array.GetRandom(pool), Phaser.Utils.Array.GetRandom(pool)];
  }

  private computeStats(genome: VisibleGenome): VisibleStats {
    const stats = {} as VisibleStats;
    STAT_KEYS.forEach((key) => {
      const loci = genome[key];
      const major = loci.slice(0, LOCUS_MAJOR).reduce((sum, pair) => sum + ALLELE_VALUES[pair[0]] + ALLELE_VALUES[pair[1]], 0);
      const minor = loci.slice(LOCUS_MAJOR, LOCUS_MAJOR + LOCUS_MINOR).reduce((sum, pair) => sum + ALLELE_VALUES[pair[0]] + ALLELE_VALUES[pair[1]], 0);
      stats[key] = Phaser.Math.Clamp(50 + major * 5 + minor * 3, 0, 100);
    });
    return stats;
  }

  private evaluateDefects(defectGenome: DefectGenome, stats: VisibleStats): string[] {
    const expressed: string[] = [];
    DEFECT_KEYS.forEach((key) => {
      const pair = defectGenome[key];
      if (pair[0] === 'r' && pair[1] === 'r') expressed.push(DEFECT_LABELS[key]);
    });
    if (stats.constitution < 42 && !expressed.includes('体弱')) expressed.push('体弱');
    if (stats.stability < 38 && !expressed.includes('不稳')) expressed.push('不稳');
    return expressed;
  }

  private traitDefinition(id: string): TraitDefinition | undefined {
    return [...INNATE_TRAITS, ...GROWTH_TRAITS].find((entry) => entry.id === id);
  }

  private traitTierFromScore(score: number, good: [number, number, number], great: [number, number]): number {
    if (score >= great[1]) return 3;
    if (score >= great[0]) return 2;
    if (score >= good[2]) return 1;
    return 0;
  }

  private addTrait(entries: TraitEntry[], id: string, tier: number): void {
    if (tier <= 0) return;
    const definition = this.traitDefinition(id);
    if (!definition) return;
    const existing = entries.find((entry) => entry.id === id);
    if (existing) {
      existing.tier = Phaser.Math.Clamp(Math.max(existing.tier, tier), 1, 4);
      return;
    }
    entries.push(this.toTrait(definition, Phaser.Math.Clamp(tier, 1, 4)));
  }

  private addPendingTrait(entries: PendingGrowthTrait[], id: string, tier: number, revealAge: number): void {
    if (tier <= 0) return;
    const definition = this.traitDefinition(id);
    if (!definition) return;
    const existing = entries.find((entry) => entry.id === id);
    if (existing) {
      existing.tier = Phaser.Math.Clamp(Math.max(existing.tier, tier), 1, 4);
      return;
    }
    entries.push(this.toPendingTrait(definition, revealAge, Phaser.Math.Clamp(tier, 1, 4)));
  }

  private legacyTier(pair: PurebloodPair | DegradationPair, positive: boolean): number {
    const allele = positive ? 'P' : 'D';
    const count = pair.filter((entry) => entry === allele).length;
    return count === 2 ? 2 : 0;
  }

  private generateInnateTraits(stats: VisibleStats, defects: string[], breedingGenome: BreedingGenome, legacyGenome: LegacyGenome): TraitEntry[] {
    const traits: TraitEntry[] = [];
    this.addTrait(traits, 'photogenic', this.traitTierFromScore(stats.appearance, [0, 0, 70], [82, 92]));
    this.addTrait(traits, 'talkative', this.traitTierFromScore(stats.eloquence, [0, 0, 68], [80, 90]));
    this.addTrait(traits, 'calmingPresence', this.traitTierFromScore(stats.gentleness, [0, 0, 68], [80, 90]));
    this.addTrait(traits, 'emotionallyStable', this.traitTierFromScore(stats.stability, [0, 0, 68], [80, 90]));
    this.addTrait(traits, 'pressureResistant', this.traitTierFromScore(stats.constitution, [0, 0, 66], [78, 88]));
    if (stats.constitution >= 68 && this.pairValue(breedingGenome.HER) >= 1) this.addTrait(traits, 'longLivedTendency', stats.constitution >= 84 ? 2 : 1);
    if (defects.includes('体弱') || stats.constitution <= 44) this.addTrait(traits, 'frailBody', defects.includes('体弱') && stats.constitution <= 38 ? 2 : 1);
    if (defects.includes('亚生育') || this.pairValue(breedingGenome.FEC) <= -2) this.addTrait(traits, 'subfertileBody', defects.includes('亚生育') && this.pairValue(breedingGenome.GES) <= -2 ? 2 : 1);
    if (defects.includes('冷淡') || stats.gentleness <= 42) this.addTrait(traits, 'coldAffect', defects.includes('冷淡') && stats.gentleness <= 36 ? 2 : 1);
    if (this.legacyTier(legacyGenome.pureblood, true) > 0) this.addTrait(traits, 'pureblood', this.legacyTier(legacyGenome.pureblood, true));
    if (this.legacyTier(legacyGenome.degradation, false) > 0) this.addTrait(traits, 'degradedLine', this.legacyTier(legacyGenome.degradation, false));
    return this.uniqueTraits(traits);
  }

  private generateGrowthTraits(stats: VisibleStats, breedingGenome: BreedingGenome, defects: string[], legacyGenome: LegacyGenome): PendingGrowthTrait[] {
    const traits: PendingGrowthTrait[] = [];
    this.addPendingTrait(traits, 'composedUnderPressure', this.traitTierFromScore(stats.stability, [0, 0, 70], [82, 90]), AGE_MATURE_REVEAL);
    this.addPendingTrait(traits, 'socialInstinct', this.traitTierFromScore(Math.max(stats.eloquence, stats.gentleness), [0, 0, 70], [82, 90]), AGE_MATURE_REVEAL);
    if (this.pairValue(breedingGenome.MND) <= -1) this.addPendingTrait(traits, 'overSensitive', this.pairValue(breedingGenome.MND) <= -3 ? 2 : 1, AGE_GROWTH_REVEAL);
    if (this.pairValue(breedingGenome.MND) >= 2) this.addPendingTrait(traits, 'bloodlineEcho', this.pairValue(breedingGenome.MND) >= 4 ? 2 : 1, AGE_MATURE_REVEAL);
    if (this.pairValue(breedingGenome.VAR) >= 2) this.addPendingTrait(traits, 'selfAwareness', this.pairValue(breedingGenome.VAR) >= 4 ? 2 : 1, AGE_MATURE_REVEAL);
    if (defects.includes('不稳') || this.legacyTier(legacyGenome.degradation, false) > 0) this.addPendingTrait(traits, 'protocolDrift', defects.includes('不稳') ? 2 : 1, AGE_MATURE_REVEAL);
    if (stats.constitution >= 76) this.addPendingTrait(traits, 'selfRepair', stats.constitution >= 90 ? 2 : 1, AGE_MATURE_REVEAL);
    if (stats.constitution <= 48 || defects.includes('体弱')) this.addPendingTrait(traits, 'overworkSensitive', stats.constitution <= 38 ? 2 : 1, AGE_MATURE_REVEAL);
    if (stats.gentleness >= 68 && stats.stability >= 68) this.addPendingTrait(traits, 'attachmentFormed', Math.min(2, 1 + Math.floor((Math.min(stats.gentleness, stats.stability) - 68) / 16)), AGE_GROWTH_REVEAL);
    return this.uniquePendingTraits(traits);
  }

  private applyTraitEffects(stats: VisibleStats, traits: TraitEntry[]): VisibleStats {
    const caps = Object.fromEntries(STAT_KEYS.map((key) => [key, 60])) as VisibleStats;
    const result = { ...stats };
    traits.forEach((trait) => {
      const definition = this.traitDefinition(trait.id);
      if (!definition) return;
      if (definition.statCaps) {
        Object.entries(definition.statCaps).forEach(([key, value]) => {
          caps[key as StatKey] += (value ?? 0) * trait.tier;
        });
      }
      if (definition.statMods) {
        Object.entries(definition.statMods).forEach(([key, value]) => {
          result[key as StatKey] += (value ?? 0) * trait.tier;
        });
      }
    });
    STAT_KEYS.forEach((key) => {
      const maxCap = Phaser.Math.Clamp(caps[key], 20, 98);
      result[key] = Phaser.Math.Clamp(result[key], 0, maxCap);
    });
    return result;
  }
  private computeLifespan(constitution: number, traits: TraitEntry[], defects: string[]): number {
    let lifespan = 72 + Math.floor((constitution - 50) / 2);
    lifespan += this.traitTierSum(traits, 'longLivedTendency') * 10;
    lifespan += this.traitTierSum(traits, 'pureblood') * 8;
    lifespan -= this.traitTierSum(traits, 'frailBody') * 8;
    lifespan -= this.traitTierSum(traits, 'degradedLine') * 12;
    if (defects.includes('体弱')) lifespan -= 4;
    return Phaser.Math.Clamp(lifespan, 45, 120);
  }

  private computeBloodlineValue(stats: VisibleStats, traits: TraitEntry[], defects: string[], breedingGenome: BreedingGenome): number {
    const topStats = [...STAT_KEYS].sort((left, right) => stats[right] - stats[left]).slice(0, 3);
    let value = topStats.reduce((sum, key) => sum + Math.floor(stats[key] / 10), 0);
    value += this.pairValue(breedingGenome.HER) * 2 + this.pairValue(breedingGenome.FEC);
    value += this.positiveTraitWeight(traits);
    value -= this.negativeTraitWeight(traits) + defects.length * 2;
    return Phaser.Math.Clamp(value, 8, 99);
  }

  private buildTags(sex: Sex, stats: VisibleStats, traits: TraitEntry[], defects: string[]): string[] {
    const ordered = [...STAT_KEYS].sort((left, right) => stats[right] - stats[left]);
    const tags: string[] = [];
    if (ordered[0] === 'gentleness') tags.push('安抚型');
    else if (ordered[0] === 'eloquence') tags.push('社交型');
    else if (ordered[0] === 'aura') tags.push('气场型');
    else if (ordered[0] === 'appearance' || ordered[0] === 'figure') tags.push(sex === '女' ? '镜面潜力' : '优良父系');
    else tags.push('稳定型');
    if (this.traitTierSum(traits, 'pureblood')) tags.push('纯血线');
    else if (traits.some((trait) => trait.id === 'longLivedTendency')) tags.push('长线血系');
    if (traits.some((trait) => trait.id === 'emotionallyStable')) tags.push('心智稳');
    if (this.traitTierSum(traits, 'degradedLine') || defects.length) tags.push('劣化隐患');
    return tags.slice(0, 3);
  }

  private toTrait(definition: TraitDefinition, tier = 1): TraitEntry { return { id: definition.id, name: definition.name, stage: definition.stage, description: definition.description, tier, polarity: definition.polarity }; }
  private toPendingTrait(definition: TraitDefinition, revealAge: number, tier = 1): PendingGrowthTrait { return { ...this.toTrait(definition, tier), revealAge }; }
  private uniqueTraits(traits: TraitEntry[]): TraitEntry[] { return traits.filter((trait, index) => traits.findIndex((entry) => entry.id === trait.id) === index); }
  private uniquePendingTraits(traits: PendingGrowthTrait[]): PendingGrowthTrait[] { return traits.filter((trait, index) => traits.findIndex((entry) => entry.id === trait.id) === index); }
  private traitTierSum(traits: TraitEntry[], id: string): number { return traits.filter((trait) => trait.id === id).reduce((sum, trait) => sum + trait.tier, 0); }
  private positiveTraitWeight(traits: TraitEntry[]): number { return traits.filter((trait) => trait.polarity === 'positive').reduce((sum, trait) => sum + trait.tier * 2, 0); }
  private negativeTraitWeight(traits: TraitEntry[]): number { return traits.filter((trait) => trait.polarity === 'negative').reduce((sum, trait) => sum + trait.tier * 2, 0); }
  private combinedTraits(card: LabCard): TraitEntry[] { return [...card.innateTraits, ...card.growthTraits]; }
  private highestTraitTier(card: LabCard, id: string): number { return this.combinedTraits(card).filter((trait) => trait.id === id).reduce((max, trait) => Math.max(max, trait.tier), 0); }

  private inheritLegacyGenome(mother: LabCard, father: LabCard | null, sample: SampleCard | null, childStatsGenome: VisibleGenome, childBreedingGenome: BreedingGenome, riskBoost: number): LegacyGenome {
    const fatherLegacy = father?.legacyGenome ?? sample!.legacyGenome;
    const childStats = this.computeStats(childStatsGenome);
    const positiveScore =
      Math.floor((childStats.appearance + childStats.aura + childStats.eloquence + childStats.stability) / 32) +
      Math.max(0, this.pairValue(childBreedingGenome.HER)) * 3 +
      Math.max(0, this.pairValue(childBreedingGenome.FEC)) * 2 -
      riskBoost * 8;
    const negativeScore =
      12 + riskBoost * 16 +
      Math.max(0, -this.pairValue(childBreedingGenome.MND)) * 4 +
      Math.max(0, 55 - childStats.constitution) / 4;

    const pureSeed = Phaser.Math.Clamp(positiveScore >= 90 ? 0.16 : positiveScore >= 75 ? 0.09 : positiveScore >= 60 ? 0.04 : 0, 0, 0.2);
    const degradeSeed = Phaser.Math.Clamp((negativeScore >= 60 ? 0.2 : negativeScore >= 42 ? 0.12 : negativeScore >= 28 ? 0.05 : 0.01), 0, 0.35);
    const inheritSpecialAllele = <T extends 'N' | 'P' | 'D'>(pair: [T, T], active: T, seedChance: number): T => {
      const selected = Phaser.Utils.Array.GetRandom(pair);
      if (selected === active) return active;
      return Phaser.Math.Between(0, 1000) < seedChance * 1000 ? active : 'N' as T;
    };
    return {
      pureblood: [
        inheritSpecialAllele(mother.legacyGenome.pureblood, 'P', pureSeed),
        inheritSpecialAllele(fatherLegacy.pureblood, 'P', pureSeed)
      ],
      degradation: [
        inheritSpecialAllele(mother.legacyGenome.degradation, 'D', degradeSeed),
        inheritSpecialAllele(fatherLegacy.degradation, 'D', degradeSeed)
      ]
    };
  }

  private applyFamilyTraitInheritance(child: LabCard, mother: LabCard, father: LabCard | null, sample: SampleCard | null, riskBoost: number): void {
    const parentTraits = [...this.combinedTraits(mother), ...(father ? this.combinedTraits(father) : [])];
    const traitIds = [...new Set(parentTraits.map((trait) => trait.id))];
    const her = Math.max(0, this.pairValue(child.breedingGenome.HER));
    traitIds.forEach((id) => {
      const definition = this.traitDefinition(id);
      if (!definition) return;
      const motherTier = this.highestTraitTier(mother, id);
      const fatherTier = father ? this.highestTraitTier(father, id) : 0;
      const sourceCount = (motherTier > 0 ? 1 : 0) + (fatherTier > 0 ? 1 : 0);
      if (!sourceCount) return;
      const baseChance = sourceCount === 2 ? 55 : 28;
      const chance = Phaser.Math.Clamp(baseChance + her * 6 + Math.max(motherTier, fatherTier) * 8 + (definition.polarity === 'negative' ? riskBoost * 12 + this.legacyTier(child.legacyGenome.degradation, false) * 10 : this.legacyTier(child.legacyGenome.pureblood, true) * 8), 0, 95);
      if (Phaser.Math.Between(0, 100) > chance) return;
      const target = definition.stage === 'growth' ? child.pendingGrowthTraits : child.innateTraits;
      const tier = Phaser.Math.Clamp(Math.max(motherTier, fatherTier) + (sourceCount === 2 ? 1 : 0), 1, 4);
      if (definition.stage === 'growth') this.addPendingTrait(target as PendingGrowthTrait[], id, tier, definition.id === 'attachmentFormed' || definition.id === 'overSensitive' ? AGE_GROWTH_REVEAL : AGE_MATURE_REVEAL);
      else this.addTrait(target as TraitEntry[], id, tier);
    });
    child.visibleStats = this.applyTraitEffects(this.computeStats(child.visibleGenome), child.innateTraits);
    child.bloodlineValue = this.computeBloodlineValue(child.visibleStats, child.innateTraits, child.expressedDefects, child.breedingGenome);
    child.tags = this.buildTags(child.sex, child.visibleStats, child.innateTraits, child.expressedDefects);
    child.lifespanPotential = this.computeLifespan(child.visibleStats.constitution, child.innateTraits, child.expressedDefects);
  }

  private collectGrandparents(motherId: string | null, fatherId: string | null): string[] {
    const ids = [motherId, fatherId].filter((id): id is string => !!id);
    const grandparents = new Set<string>();
    ids.forEach((id) => {
      const parent = this.cards.find((card) => card.id === id);
      if (!parent) return;
      if (parent.motherId) grandparents.add(parent.motherId);
      if (parent.fatherId) grandparents.add(parent.fatherId);
    });
    return [...grandparents];
  }

  private updateLifeStage(card: LabCard): void {
    if (card.isPlayerSelf) {
      card.lifeStage = 'mature';
      return;
    }
    if (card.ageDays <= 6) { card.lifeStage = 'infant'; return; }
    if (card.ageDays <= 17) { card.lifeStage = 'growth'; return; }
    const ratio = (card.ageDays + card.agingWear) / card.lifespanPotential;
    if (ratio < 0.45) card.lifeStage = 'mature';
    else if (ratio < 0.7) card.lifeStage = 'prime';
    else if (ratio < 0.9) card.lifeStage = 'declining';
    else card.lifeStage = 'aging';
  }

  private revealGrowthTraits(card: LabCard): void {
    const revealable = card.pendingGrowthTraits.filter((trait) => card.ageDays >= trait.revealAge);
    if (!revealable.length) return;
    revealable.forEach((trait) => {
      card.growthTraits.push({ id: trait.id, name: trait.name, stage: trait.stage, description: trait.description, tier: trait.tier, polarity: trait.polarity });
      this.pushLog(`${card.name} 觉醒了成长特质“${trait.name}”。`);
    });
    card.pendingGrowthTraits = card.pendingGrowthTraits.filter((trait) => card.ageDays < trait.revealAge);
    card.visibleStats = this.applyTraitEffects(this.computeStats(card.visibleGenome), [...card.innateTraits, ...card.growthTraits]);
    card.bloodlineValue = this.computeBloodlineValue(card.visibleStats, [...card.innateTraits, ...card.growthTraits], card.expressedDefects, card.breedingGenome);
    card.tags = this.buildTags(card.sex, card.visibleStats, [...card.innateTraits, ...card.growthTraits], card.expressedDefects);
  }

  private applyVisibleStateClamp(card: LabCard): void {
    card.stamina = Phaser.Math.Clamp(card.stamina, 0, card.maxStamina);
    card.health = Phaser.Math.Clamp(card.health, 0, card.maxHealth);
    if (card.sex === '女') card.loyalty = Phaser.Math.Clamp(card.loyalty, 0, card.maxLoyalty);
    card.protocolStability = Phaser.Math.Clamp(card.protocolStability, 0, 100);
  }

  private baseWear(card: LabCard): number { if (card.lifeStage === 'declining') return 2; if (card.lifeStage === 'aging') return 3; return 1; }
  private healthLossOnMission(card: LabCard): number { let loss = 2 + Math.max(0, 2 - Math.floor((card.visibleStats.constitution - 50) / 15)); loss -= this.highestTraitTier(card, 'pressureResistant'); loss += this.highestTraitTier(card, 'overworkSensitive'); loss += this.highestTraitTier(card, 'frailBody'); loss += this.highestTraitTier(card, 'degradedLine'); return Math.max(1, loss); }
  private healthLossOnPregnancy(card: LabCard): number { let loss = 2; loss += this.highestTraitTier(card, 'subfertileBody'); loss += this.highestTraitTier(card, 'frailBody'); if (card.lifeStage === 'declining' || card.lifeStage === 'aging') loss += 1; return loss; }
  private passiveHealthRecovery(card: LabCard): number { let gain = 1 + this.sumActiveEffect('healthRecoveryDaily'); gain += this.highestTraitTier(card, 'selfRepair'); gain -= this.highestTraitTier(card, 'frailBody'); gain -= this.highestTraitTier(card, 'degradedLine'); return Math.max(0, gain); }
  private loyaltyLoss(card: LabCard): number { if (!card.mission) return 0; let loss = Math.max(1, card.mission.targetCharisma + card.mission.pressure - Math.floor((card.visibleStats.stability - 50) / 15)); loss -= this.highestTraitTier(card, 'composedUnderPressure'); loss += this.highestTraitTier(card, 'overSensitive'); loss += Math.ceil(this.highestTraitTier(card, 'degradedLine') / 2); loss += this.highestTraitTier(card, 'coldAffect'); return Math.max(1, loss); }
  private protocolDrift(card: LabCard): number { let drift = card.mission ? 1 + card.mission.pressure : 0; if (this.hasTrait(card, 'protocolDrift')) drift += 2; if (this.hasTrait(card, 'selfAwareness')) drift += 1; if (this.hasTrait(card, 'emotionallyStable')) drift -= 1; return Math.max(0, drift); }

  private computeMissionRisk(card: LabCard, target: MissionTarget): number {
    const match = this.matchScore(card, target);
    const healthPenalty = card.health < 60 ? 8 : card.health < 75 ? 4 : 0;
    const staminaPenalty = card.stamina < 40 ? 8 : card.stamina < 60 ? 4 : 0;
    const stagePenalty = card.lifeStage === 'declining' ? 6 : card.lifeStage === 'aging' ? 12 : card.lifeStage === 'growth' || card.lifeStage === 'infant' ? 20 : 0;
    const loyaltyPenalty = card.sex === '女' ? Math.max(0, 20 - Math.floor(card.loyalty / 5)) : 0;
    const protocolPenalty = card.protocolStability < 40 ? 8 : 0;
    return Phaser.Math.Clamp(54 + target.difficultyMod + target.pressure * 6 + target.targetCharisma * 3 - match * 5 + healthPenalty + staminaPenalty + stagePenalty + loyaltyPenalty + protocolPenalty + this.traitMissionModifier(card) + this.sumActiveEffect('missionRiskMod'), 8, 95);
  }

  private matchScore(card: LabCard, target: MissionTarget): number {
    const pref = target.preferenceStats.reduce((sum, key) => sum + Math.floor((card.visibleStats[key] - 50) / 10), 0);
    const purpose = target.purposeStats.reduce((sum, key) => sum + Math.floor((card.visibleStats[key] - 50) / 10), 0);
    return pref + purpose;
  }

  private traitMissionModifier(card: LabCard): number {
    let mod = 0;
    mod -= this.highestTraitTier(card, 'talkative') * 2;
    mod -= this.highestTraitTier(card, 'calmingPresence') * 2;
    mod -= this.highestTraitTier(card, 'socialInstinct') * 3;
    mod += this.highestTraitTier(card, 'overSensitive') * 3;
    mod += this.highestTraitTier(card, 'frailBody') * 4;
    mod -= this.highestTraitTier(card, 'pureblood') * 2;
    mod += this.highestTraitTier(card, 'degradedLine') * 5;
    return mod;
  }

  private purebloodCarrierWeight(legacyGenome: LegacyGenome): number {
    return legacyGenome.pureblood.filter((allele) => allele === 'P').length;
  }

  private degradationCarrierWeight(legacyGenome: LegacyGenome): number {
    return legacyGenome.degradation.filter((allele) => allele === 'D').length;
  }

  private purebloodTransmitChance(legacyGenome: LegacyGenome, seedChance: number): number {
    const carrier = this.purebloodCarrierWeight(legacyGenome) / 2;
    return Phaser.Math.Clamp(carrier + (1 - carrier) * seedChance, 0, 1);
  }

  private degradationTransmitChance(legacyGenome: LegacyGenome, seedChance: number): number {
    const carrier = this.degradationCarrierWeight(legacyGenome) / 2;
    return Phaser.Math.Clamp(carrier + (1 - carrier) * seedChance, 0, 1);
  }

  private computePurebloodChance(mother: LabCard, father: LabCard | null, sample: SampleCard | null, positiveScore: number, negativeScore: number, riskBoost: number): number {
    const fatherLegacy = father?.legacyGenome ?? sample!.legacyGenome;
    const seedChance = Phaser.Math.Clamp((positiveScore - 26) / 220 - riskBoost * 0.01 - negativeScore / 900, 0, 0.18);
    const chance = this.purebloodTransmitChance(mother.legacyGenome, seedChance) * this.purebloodTransmitChance(fatherLegacy, seedChance);
    return Math.round(Phaser.Math.Clamp(chance * 100, 0, 95));
  }

  private computeDegradationChance(mother: LabCard, father: LabCard | null, sample: SampleCard | null, positiveScore: number, negativeScore: number, riskBoost: number): number {
    const fatherLegacy = father?.legacyGenome ?? sample!.legacyGenome;
    const seedChance = Phaser.Math.Clamp(negativeScore / 180 + riskBoost * 0.04 - positiveScore / 500, 0, 0.35);
    const chance = this.degradationTransmitChance(mother.legacyGenome, seedChance) * this.degradationTransmitChance(fatherLegacy, seedChance);
    return Math.round(Phaser.Math.Clamp(chance * 100, 0, 98));
  }

  private pairValue(pair: GenePair): number { return ALLELE_VALUES[pair[0]] + ALLELE_VALUES[pair[1]]; }
  private inheritGenePair(a: GenePair, b: GenePair): GenePair { return [Phaser.Utils.Array.GetRandom(a), Phaser.Utils.Array.GetRandom(b)]; }
  private inheritSimplePair(a: GenePair, b: GenePair): GenePair { return [Phaser.Utils.Array.GetRandom(a), Phaser.Utils.Array.GetRandom(b)]; }
  private inheritDefectPair(a: ['R' | 'r', 'R' | 'r'], b: ['R' | 'r', 'R' | 'r'], riskBoost: number): ['R' | 'r', 'R' | 'r'] { const left = Phaser.Utils.Array.GetRandom(a); const right = Phaser.Utils.Array.GetRandom(b); const extra = riskBoost > 0 && left === 'R' && right === 'R' && Phaser.Math.Between(0, 100) < riskBoost * 8; return extra ? ['R', 'r'] : [left, right]; }

  private computeBloodlineRisk(mother: LabCard, father: LabCard): { band: RiskBand; detail: string; negativeBoost: number } {
    if (mother.id === father.id) return { band: '极高', detail: '同一对象不可视为安全血线。', negativeBoost: 3 };
    if (mother.id === father.motherId || mother.id === father.fatherId || father.id === mother.motherId || father.id === mother.fatherId) return { band: '极高', detail: '直系血缘重叠。', negativeBoost: 3 };
    if (mother.motherId && mother.motherId === father.motherId && mother.fatherId && mother.fatherId === father.fatherId) return { band: '极高', detail: '同父同母。', negativeBoost: 3 };
    const parentOverlap = [mother.motherId, mother.fatherId].filter(Boolean).some((id) => id === father.motherId || id === father.fatherId);
    if (parentOverlap) return { band: '高', detail: '共享一位父或母。', negativeBoost: 2 };
    if (mother.grandparentIds.some((id) => father.grandparentIds.includes(id))) return { band: '中', detail: '共享祖父母血线。', negativeBoost: 1 };
    return { band: '低', detail: '未见祖父母深度内的重叠。', negativeBoost: 0 };
  }

  private projectChildTendency(mother: LabCard, father: LabCard | null, sample: SampleCard | null): string[] {
    const fatherStats = father?.visibleStats ?? this.computeStats(sample!.visibleGenome);
    const combined = {} as VisibleStats;
    STAT_KEYS.forEach((key) => { combined[key] = Math.round((mother.visibleStats[key] + fatherStats[key]) / 2); });
    return this.projectedTendency(combined);
  }

  private breedingFailureReason(mother: LabCard, father: LabCard | null, sample: SampleCard | null, summary: BreedingSummary, fecScore: number): string {
    const reasons: string[] = [];
    if (mother.health < 70) reasons.push('母体健康储备不足');
    if (mother.stamina < 65) reasons.push('母体体力恢复不够');
    if (fecScore <= 0) reasons.push('配对繁殖力偏低');
    else if (fecScore <= 2) reasons.push('繁殖力只在临界线附近');
    if (summary.negativeRange[0] >= 2) reasons.push('预计坏特质压力过高');
    if (summary.degradationChance >= 25) reasons.push('劣化风险过高');
    if (summary.positiveRange[1] <= 1) reasons.push('可保留的好特质太少');
    if (!reasons.length) {
      if (father) return `父本 ${father.name} 与母体状态暂时没有形成稳定启动窗口`;
      if (sample) return `样本 ${sample.name} 与母体状态暂时没有形成稳定启动窗口`;
      return '当前配对尚未形成稳定启动窗口';
    }
    return reasons.slice(0, 2).join('，');
  }

  private createSample(name: string, source: string, quality: 'B' | 'A' | 'S', tags: string[]): SampleCard {
    const tier = quality === 'S' ? 'strong' : quality === 'A' ? 'good' : 'balanced';
    return {
      id: `sample-${Phaser.Math.RND.uuid().slice(0, 6)}`,
      name,
      source,
      quality,
      tags,
      usesLeft: quality === 'S' ? 2 : 1,
      visibleGenome: this.makeVisibleGenome({ appearance: tier, figure: tier, aura: tier, gentleness: 'balanced', eloquence: tier, stability: 'good', constitution: 'good' }),
      breedingGenome: this.makeBreedingGenome({ FEC: tier, GES: 'good', HER: quality === 'S' ? 'strong' : 'good', VAR: quality === 'B' ? 'balanced' : 'good', MND: 'balanced' }),
      defectGenome: this.makeDefectGenome(quality === 'S' ? 'low' : 'medium'),
      legacyGenome: this.makeLegacyGenome(quality === 'S' ? 'sample-S' : quality === 'A' ? 'sample-A' : 'sample-B')
    };
  }

  private createMissionTarget(): MissionTarget {
    const names = ['沈', '周', '林', '许', '韩', '顾', '程', '梁', '宋'];
    const titles = ['私人顾问', '年轻议员', '基金经理', '研究院主任', '剧院投资人', '安保主管', '医药合伙人'];
    const purposes = ['拿到下周出席名单', '确认保险箱口令', '复制会所门禁', '观察合作人脉结构', '记录行程漏洞', '接近内圈秘书'];
    const publicHints = ['他对过度表现很敏感，更偏好自然稳定的陪同。', '他会先考察谈吐是否稳妥，再决定是否靠近。', '他在外人面前克制，但私下容易被耐心倾听打动。', '他身份敏感，压迫感和魅力都偏高。'];
    const statPool = [...STAT_KEYS];
    const prefA = Phaser.Utils.Array.GetRandom(statPool) as StatKey;
    const prefB = Phaser.Utils.Array.GetRandom(statPool.filter((key) => key !== prefA)) as StatKey;
    const purposeKey = Phaser.Utils.Array.GetRandom(statPool.filter((key) => key !== prefA && key !== prefB)) as StatKey;
    const name = `${Phaser.Utils.Array.GetRandom(names)}先生`;
    const title = Phaser.Utils.Array.GetRandom(titles);
    const purpose = Phaser.Utils.Array.GetRandom(purposes);
    const difficulty = this.rollMissionDifficulty();
    const config = this.missionDifficultyConfig(difficulty);
    const reward = Phaser.Math.Between(config.rewardMin, config.rewardMax);
    const charisma = Phaser.Math.Between(config.charismaMin, config.charismaMax);
    const pressure = Phaser.Math.Between(config.pressureMin, config.pressureMax);
    const clues: MissionClue[] = [
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, label: '公开线', text: Phaser.Utils.Array.GetRandom(publicHints), cost: 0, unlocked: true },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, label: '偏好线', text: `${name} 更容易把注意力放到 ${STAT_LABELS[prefA]} 与 ${STAT_LABELS[prefB]} 足够稳的人身上。`, cost: 4, unlocked: false },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, label: '任务线', text: `若要完成“${purpose}”，至少要让 ${STAT_LABELS[purposeKey]} 和 ${STAT_LABELS[prefB]} 不拖后腿。`, cost: 5, unlocked: false },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, label: '压力线', text: `目标魅力 ${charisma}、压力 ${pressure}，连续推进时会明显消耗忠诚和协议稳定。`, cost: 6, unlocked: false }
    ];
    config.unlockedClues.forEach((index) => {
      if (clues[index]) clues[index].unlocked = true;
    });
    return {
      id: `target-${Phaser.Math.RND.uuid().slice(0, 6)}`,
      name,
      title,
      difficulty,
      purpose,
      duration: Phaser.Math.Between(config.durationMin, config.durationMax),
      reward,
      targetCharisma: charisma,
      pressure,
      difficultyMod: config.difficultyMod,
      preferenceStats: [prefA, prefB],
      purposeStats: [purposeKey, prefB],
      clues,
      assignedCardId: null,
      daysRemaining: 0,
      failureRisk: 0
    };
  }
  private generateName(sex: Sex, genome: VisibleGenome, serial: number): string {
    const stats = this.computeStats(genome);
    const ordered = [...STAT_KEYS].sort((left, right) => stats[right] - stats[left]);
    const female: Record<StatKey, string> = { appearance: '绮', figure: '纱', aura: '澜', gentleness: '柔', eloquence: '语', stability: '宁', constitution: '衡' };
    const male: Record<StatKey, string> = { appearance: '曜', figure: '岳', aura: '宸', gentleness: '温', eloquence: '言', stability: '衡', constitution: '砺' };
    const suffix: Record<StatKey, string> = { appearance: '颜', figure: '姿', aura: '仪', gentleness: '心', eloquence: '辞', stability: '序', constitution: '岳' };
    const prefix = sex === '女' ? female[ordered[0]] : male[ordered[0]];
    return `${prefix}${suffix[ordered[1] ?? ordered[0]]}${serial}号`;
  }

  private hasTrait(card: LabCard, traitId: string): boolean { return [...card.innateTraits, ...card.growthTraits].some((trait) => trait.id === traitId); }
  private isBreedingReady(card: LabCard): boolean { return card.lifeStage !== 'infant' && card.lifeStage !== 'growth' && !card.mission && !card.pregnancy && card.stamina >= 50 && card.health >= 60; }
  private isMissionReady(card: LabCard): boolean { return card.sex === '女' && card.lifeStage !== 'infant' && card.lifeStage !== 'growth' && !card.mission && !card.pregnancy && card.stamina >= 35 && card.health >= 45 && card.loyalty >= 35; }
  private target(id?: string | null): MissionTarget | null { return id ? this.targets.find((entry) => entry.id === id) ?? null : null; }
  private card(id?: string | null): LabCard | null { return id ? this.cards.find((entry) => entry.id === id) ?? null : null; }
  private sample(id?: string | null): SampleCard | null { return id ? this.samples.find((entry) => entry.id === id) ?? null : null; }
  private inRoster(x: number, y: number): boolean { return x >= LEFT_PANEL_X && x <= LEFT_PANEL_X + LEFT_PANEL_WIDTH && y >= 96 && y <= ROSTER_VIEW_BOTTOM; }
  private maxScroll(): number {
    const rows = this.rosterTab === 'sample' ? this.samples.length : this.filteredCards().length;
    const rowStep = ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP;
    const contentHeight = rows > 0 ? rows * ROSTER_CARD_HEIGHT + Math.max(0, rows - 1) * ROSTER_CARD_GAP : 0;
    const viewportHeight = ROSTER_VIEW_BOTTOM - ROSTER_VIEW_TOP;
    return Math.max(0, contentHeight - viewportHeight);
  }
  private clampScroll(value: number): number { return Phaser.Math.Clamp(value, 0, this.maxScroll()); }
  private formatMonitorEntry(entry: string, charsPerLine: number, maxLines: number): string {
    const parts: string[] = [];
    for (let index = 0; index < entry.length && parts.length < maxLines; index += charsPerLine) {
      parts.push(entry.slice(index, index + charsPerLine));
    }
    if (entry.length > charsPerLine * maxLines && parts.length) {
      const last = parts[parts.length - 1];
      parts[parts.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
    }
    return parts.join('\n');
  }
  private maxMonitorScroll(): number { return Math.max(0, this.log.length - 4); }
  private clampMonitorScroll(value: number): number { return Phaser.Math.Clamp(value, 0, this.maxMonitorScroll()); }
  private pushLog(message: string): void { this.log.unshift(message); this.log = this.log.slice(0, 30); this.monitorScroll = this.clampMonitorScroll(this.monitorScroll); }
  private inMonitor(x: number, y: number): boolean { return x >= RIGHT_PANEL_X + 12 && x <= RIGHT_PANEL_X + RIGHT_PANEL_WIDTH - 12 && y >= RIGHT_PANEL_Y + 40 && y <= RIGHT_PANEL_Y + MONITOR_PANEL_HEIGHT - 14; }
  private snapRosterScroll(value: number): number {
    const rowStep = ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP;
    return this.clampScroll(Math.round(value / rowStep) * rowStep);
  }

  private installTextFactory(): void {
    const factory = this.add;
    const originalText = factory.text.bind(factory);
    const scene = this;
    (factory as typeof factory & {
      text: (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
    }).text = function patchedText(x, y, text, style) {
      return originalText(x, y, text, scene.withUiFont(style));
    };
  }

  private withUiFont(style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: UI_FONT_FAMILY,
      padding: { top: 2, bottom: 2, left: 0, right: 0 },
      ...style
    };
  }

  private wrapUiText(text: string, maxCharsPerLine: number): string {
    const normalized = text.replace(/\r/g, '');
    const paragraphs = normalized.split('\n');
    const wrapped = paragraphs.map((paragraph) => {
      if (!paragraph) return '';
      const lines: string[] = [];
      let current = '';
      for (const char of paragraph) {
        current += char;
        if (current.length >= maxCharsPerLine) {
          lines.push(current);
          current = '';
        }
      }
      if (current) lines.push(current);
      return lines.join('\n');
    });
    return wrapped.join('\n');
  }

  private button(x: number, y: number, w: number, h: number, label: string, enabled: boolean, onClick: () => void, fill = 0x334155): void {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, enabled ? fill : 0x374151, enabled ? 0.96 : 0.5).setStrokeStyle(1, enabled ? 0xe9d5ff : 0x6b7280);
    const text = this.add.text(x + w / 2, y + h / 2, label, { fontSize: '10px', color: enabled ? '#fff7fb' : '#9ca3af', fontStyle: 'bold' }).setOrigin(0.5);
    this.ui.push(bg, text);
    if (enabled) bg.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }
}
