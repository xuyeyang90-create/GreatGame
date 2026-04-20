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
  type TraitDefinition,
  type VisibleGenome
} from '../data/labConfig';

type RiskBand = '低' | '中' | '高' | '极高';
type RosterTab = 'female' | 'male' | 'sample';
type PageTab = 'breed' | 'assign';
type HelpSection = 'library' | 'monitor' | 'actions';
type MissionDifficulty = 'low' | 'mid' | 'high';
type EventSource = 'day' | 'balance' | 'random';

type TraitEntry = { id: string; name: string; stage: 'innate' | 'growth'; description: string };
type PendingGrowthTrait = TraitEntry & { revealAge: number };
type VisibleStats = Record<StatKey, number>;
type LabEventOption = { label: string; effectText: string; apply: () => string };
type LabEvent = { id: string; title: string; body: string; source: EventSource; options: LabEventOption[] };
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
const ROSTER_CARD_HEIGHT = 132;
const ROSTER_CARD_GAP = 8;
const ROSTER_VIEW_TOP = 128;
const ROSTER_VIEW_BOTTOM = 506;
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
    this.pushLog('本轮切片引入年龄、健康、寿命磨损、成长特质和祖父母深度血系风险。');
  }

  private drawShell(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x120c18);
    this.add.rectangle(width / 2, 34, width - 20, 54, 0x23162d, 0.95).setStrokeStyle(2, 0x5c3b6b);
    this.add.rectangle(330, 292, 620, 458, 0x1b1323, 0.94).setStrokeStyle(2, 0x654578);
    this.add.rectangle(814, 202, 262, 278, 0x1a1222, 0.95).setStrokeStyle(2, 0x72508a);
    this.add.rectangle(814, 446, 262, 214, 0x1a1222, 0.95).setStrokeStyle(2, 0x72508a);
    this.add.text(132, 18, '生化实验室切片', { fontSize: '20px', color: '#fff7fb', fontStyle: 'bold' });
    this.add.text(24, 70, '卡库', { fontSize: '18px', color: '#f5d0fe', fontStyle: 'bold' });
    this.add.text(690, 70, '实验室显示屏', { fontSize: '17px', color: '#f5d0fe', fontStyle: 'bold' });
    this.add.text(690, 336, '主操作区', { fontSize: '17px', color: '#f5d0fe', fontStyle: 'bold' });
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
    if (this.detailTargetId) this.renderTargetDetail();
    if (this.traitDetail) this.renderTraitDetail();
    if (this.helpSection) this.renderHelp();
    if (this.pendingEvent) this.renderEventModal();
  }

  private renderHeader(): void {
    this.button(24, 12, 92, 26, '推进一天', !this.pendingEvent, () => this.advanceDay(), 0x6d28d9);
  }

  private renderSectionHelpButtons(): void {
    this.button(610, 68, 24, 20, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'library';
      this.render();
    }, 0x4c1d95);
    this.button(884, 68, 24, 20, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'monitor';
      this.render();
    }, 0x4c1d95);
    this.button(884, 334, 24, 20, '?', !this.helpSection && !this.pendingEvent, () => {
      this.helpSection = 'actions';
      this.render();
    }, 0x4c1d95);
  }

  private renderRosterTabs(): void {
    this.button(24, 98, 72, 22, '女性', this.rosterTab !== 'female', () => { this.rosterTab = 'female'; this.rosterScroll = 0; this.render(); }, 0x7c3aed);
    this.button(104, 98, 72, 22, '男性', this.rosterTab !== 'male', () => { this.rosterTab = 'male'; this.rosterScroll = 0; this.render(); }, 0x1d4ed8);
    this.button(184, 98, 92, 22, '带回样本', this.rosterTab !== 'sample', () => { this.rosterTab = 'sample'; this.rosterScroll = 0; this.render(); }, 0x0f766e);
  }

  private renderMonitor(): void {
    const infiltrating = this.cards.filter((card) => !!card.mission).length;
    const pregnant = this.cards.filter((card) => !!card.pregnancy).length;
    const averageHealth = this.cards.length ? Math.round(this.cards.reduce((sum, card) => sum + card.health, 0) / this.cards.length) : 0;
    const decliningCount = this.cards.filter((card) => card.lifeStage === 'declining' || card.lifeStage === 'aging').length;
    const visibleEntries = 4;
    this.monitorScroll = this.clampMonitorScroll(this.monitorScroll);
    const recent = this.log.slice(this.monitorScroll, this.monitorScroll + visibleEntries).map((entry) => this.formatMonitorEntry(entry, 18, 2));
    const activeEffects = this.activeEffects.slice(0, 2);
    const screenX = 690;
    const screenY = 94;
    this.ui.push(
      this.add.rectangle(814, 204, 228, 228, 0x0b1319, 0.98).setStrokeStyle(2, 0x38bdf8),
      this.add.text(screenX + 8, screenY + 4, '运行概况', { fontSize: '13px', color: '#67e8f9', fontStyle: 'bold' }),
      this.add.text(screenX + 8, screenY + 24, `日期 ${this.day} | 资金 ${this.money}`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 40, `样本 ${this.samples.length} | 潜入 ${infiltrating}`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 56, `怀孕 ${pregnant} | 暴露 ${this.exposureRisk}/100`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 72, `平均健康 ${averageHealth} | 衰退/老化 ${decliningCount}`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 94, '持续状态', { fontSize: '11px', color: '#67e8f9', fontStyle: 'bold' }),
      this.add.text(screenX + 8, screenY + 128, '近期事件', { fontSize: '11px', color: '#67e8f9', fontStyle: 'bold' }),
      this.add.text(screenX + 128, screenY + 128, `${Math.min(this.monitorScroll + 1, Math.max(1, this.log.length))}/${Math.max(1, this.log.length)}`, { fontSize: '8px', color: '#67e8f9' })
    );
    if (activeEffects.length) {
      activeEffects.forEach((effect, index) => {
        this.ui.push(this.add.text(screenX + 8, screenY + 108 + index * 10, `- ${effect.title}(${effect.daysRemaining}天): ${effect.description}`, { fontSize: '8px', color: '#d8f9ff', wordWrap: { width: 208 } }));
      });
      if (this.activeEffects.length > activeEffects.length) {
        this.ui.push(this.add.text(screenX + 192, screenY + 118, `+${this.activeEffects.length - activeEffects.length}`, { fontSize: '8px', color: '#67e8f9' }));
      }
    } else {
      this.ui.push(this.add.text(screenX + 8, screenY + 108, '- 当前无持续影响', { fontSize: '8px', color: '#94a3b8' }));
    }
    recent.forEach((entry, index) => {
      this.ui.push(this.add.text(screenX + 8, screenY + 148 + index * 22, `> ${entry}`, { fontSize: '9px', color: '#d8f9ff', lineSpacing: 2 }));
    });
  }
  private renderRoster(): void {
    const width = 620;
    const height = ROSTER_CARD_HEIGHT;
    const startX = 18;
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
      const fill = card.sex === '女' ? 0x2a1631 : 0x142133;
      const stroke = card.sex === '女' ? 0xf472b6 : 0x60a5fa;
      this.ui.push(this.add.rectangle(x + width / 2, y + height / 2, width, height, fill, 0.97).setStrokeStyle(2, stroke));
      this.renderCardAvatar(card, x + 42, y + 44);
      this.ui.push(
        this.add.text(x + 84, y + 10, `${card.name} 第${card.generation}代`, { fontSize: '15px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(x + 84, y + 30, this.cardSummaryLine(card), { fontSize: '11px', color: card.sex === '女' ? '#f9a8d4' : '#7dd3fc', wordWrap: { width: 316 } }),
        this.add.text(x + 84, y + 48, `${this.cardStateLabel(card)} | ${card.tags.join(' | ')}`, { fontSize: '11px', color: '#fde68a', wordWrap: { width: 316 } }),
        this.add.text(x + 84, y + 114, `缺陷: ${card.expressedDefects.length ? card.expressedDefects.join('、') : '无'}`, { fontSize: '10px', color: card.expressedDefects.length ? '#fda4af' : '#cbd5e1', wordWrap: { width: 316 } })
      );
      this.renderTraitChips(card, x + 84, y + 68);
      this.renderStatBadges(card.visibleStats, x + 84, y + 88);
      this.renderCardButtons(card, x + 428, y + 20);
    });
  }

  private renderSamples(startX: number, startY: number, width: number, height: number, gap: number, bottom: number): void {
    this.samples.forEach((sample, index) => {
      const x = startX;
      const y = startY + index * (height + gap) - this.rosterScroll;
      if (y + height < startY || y > bottom) return;
      const active = this.fatherSampleId === sample.id;
      this.ui.push(this.add.rectangle(x + width / 2, y + height / 2, width, height, active ? 0x15314a : 0x132430, 0.97).setStrokeStyle(2, active ? 0x93c5fd : 0x38bdf8));
      this.ui.push(
        this.add.text(x + 24, y + 12, sample.name, { fontSize: '15px', color: '#e0f2fe', fontStyle: 'bold' }),
        this.add.text(x + 24, y + 32, `来源: ${sample.source} | 质量 ${sample.quality} | 剩余 ${sample.usesLeft}`, { fontSize: '10px', color: '#93c5fd' }),
        this.add.text(x + 24, y + 48, `标签: ${sample.tags.join(' | ')}`, { fontSize: '10px', color: '#bfdbfe', wordWrap: { width: 380 } }),
        this.add.text(x + 24, y + 66, `倾向: ${this.projectedTendency(this.computeStats(sample.visibleGenome)).join(' / ')}`, { fontSize: '9px', color: '#e0f2fe', wordWrap: { width: 380 } })
      );
      this.button(x + 474, y + 36, 96, 24, active ? '取消样本' : '选为父本', this.page === 'breed', () => this.setFatherSample(sample.id), 0x1d4ed8);
    });
  }

  private renderRightPanel(): void {
    this.button(690, 340, 92, 22, '繁育', this.page !== 'breed', () => { this.page = 'breed'; this.render(); }, 0x7c3aed);
    this.button(792, 340, 92, 22, '委托', this.page !== 'assign', () => { this.page = 'assign'; this.render(); }, 0x047857);
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
      this.add.text(690, 372, '繁育台', { fontSize: '13px', color: '#f5d0fe', fontStyle: 'bold' }),
      this.add.text(690, 392, mother ? `${mother.name} | ${LIFE_STAGE_LABELS[mother.lifeStage]} | 体力${mother.stamina} | 健康${mother.health}` : '母本: 未选择', { fontSize: '9px', color: mother ? '#f5d0fe' : '#94a3b8', wordWrap: { width: 196 } }),
      this.add.text(690, 412, father ? `${father.name} | 血系值${father.bloodlineValue}` : sample ? `${sample.name} | 质量${sample.quality}` : '父本: 未选择', { fontSize: '9px', color: father || sample ? '#dbeafe' : '#94a3b8', wordWrap: { width: 196 } }),
      this.add.text(690, 438, `成功率 ${summary.successBand} | 血系风险 ${summary.bloodlineRisk}`, { fontSize: '10px', color: '#fde68a' }),
      this.add.text(690, 454, `孕程风险 ${summary.gestationRisk} | 心智风险 ${summary.mentalRisk}`, { fontSize: '10px', color: '#fde68a' }),
      this.add.text(690, 478, `费用 ${summary.cost}`, { fontSize: '11px', color: '#bfdbfe', fontStyle: 'bold' })
    );
    this.button(690, 510, 92, 22, '清空选择', !!this.motherId || !!this.fatherCardId || !!this.fatherSampleId, () => { this.motherId = null; this.fatherCardId = null; this.fatherSampleId = null; this.render(); }, 0x475569);
    this.button(794, 510, 92, 22, '开始繁育', summary.canBreed, () => this.startBreeding(), 0x7c3aed);
  }

  private renderAssignmentPanel(): void {
    const operative = this.card(this.assignmentCardId);
    this.ui.push(
      this.add.text(690, 372, '委托台', { fontSize: '13px', color: '#bbf7d0', fontStyle: 'bold' }),
      this.add.text(690, 392, operative ? `${operative.name} | 年龄${operative.ageDays} | 健康${operative.health} | 忠诚${operative.loyalty}` : '特工: 未选择', { fontSize: '10px', color: operative ? '#dcfce7' : '#94a3b8', wordWrap: { width: 196 } })
    );
    this.targets.forEach((target, index) => {
      const y = 416 + index * 48;
      const active = !!target.assignedCardId;
      const assigned = this.card(target.assignedCardId);
      const stroke = this.missionDifficultyColor(target.difficulty);
      const difficultyLabel = this.missionDifficultyLabel(target.difficulty);
      this.ui.push(
        this.add.rectangle(814, y + 18, 228, 40, active ? 0x1d2f2a : 0x24152b, 0.98).setStrokeStyle(1, active ? 0x10b981 : stroke),
        this.add.text(698, y + 2, `${difficultyLabel} | ${target.name} · ${target.title}`, { fontSize: '9px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(698, y + 14, target.purpose, { fontSize: '8px', color: '#fde68a', wordWrap: { width: 126 } })
      );
      if (active) {
        this.ui.push(this.add.text(698, y + 28, `${assigned?.name ?? '失联'} | ${target.daysRemaining}天 | 风险${Math.round(target.failureRisk)}%`, { fontSize: '8px', color: '#bbf7d0', wordWrap: { width: 126 } }));
      } else {
        this.ui.push(this.add.text(698, y + 28, `报酬 ${target.reward} | 压力 ${target.pressure}`, { fontSize: '8px', color: '#bfdbfe' }));
      }
      this.button(830, y + 2, 32, 16, '详情', true, () => { this.detailTargetId = target.id; this.render(); }, 0x6d28d9);
      this.button(866, y + 2, 24, 16, '换', !active && this.money >= 4, () => this.refreshTarget(target.id), 0x0f766e);
      this.button(830, y + 22, 60, 16, active ? '进行中' : '派出', !active && this.canAssign(target.id), () => this.assignTarget(target.id), 0x047857);
    });
  }

  private renderTargetDetail(): void {
    const target = this.target(this.detailTargetId);
    if (!target) { this.detailTargetId = null; return; }
    const difficultyLabel = this.missionDifficultyLabel(target.difficulty);
    const difficultyColor = this.missionDifficultyColor(target.difficulty);
    this.ui.push(
      this.add.rectangle(480, 270, 940, 500, 0x05030a, 0.82),
      this.add.rectangle(480, 270, 720, 406, 0x16111e, 0.98).setStrokeStyle(2, difficultyColor),
      this.add.text(148, 90, `${target.name} · ${target.title}`, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(148, 122, `${difficultyLabel} | 目标目的: ${target.purpose}`, { fontSize: '13px', color: '#fde68a' }),
      this.add.text(148, 144, `报酬 ${target.reward} | 持续 ${target.duration} 天 | 魅力 ${target.targetCharisma} | 压力 ${target.pressure}`, { fontSize: '12px', color: '#a7f3d0' })
    );
    target.clues.forEach((clue, index) => {
      const y = 182 + index * 54;
      this.ui.push(this.add.rectangle(396, y + 16, 500, 40, 0x0b1319, 0.94).setStrokeStyle(1, 0x38bdf8), this.add.text(164, y + 2, clue.label, { fontSize: '11px', color: '#67e8f9', fontStyle: 'bold' }));
      if (clue.unlocked) this.ui.push(this.add.text(164, y + 18, this.wrapUiText(clue.text, 28), { fontSize: '10px', color: '#d8f9ff' }));
      else {
        this.ui.push(this.add.text(164, y + 18, '??? 支付资金后解锁。', { fontSize: '10px', color: '#94a3b8' }));
        this.button(590, y + 10, 86, 18, `解锁 ${clue.cost}`, this.money >= clue.cost && !target.assignedCardId, () => this.unlockClue(target.id, clue.id), 0x0f766e);
      }
    });
    this.button(726, 98, 60, 20, '关闭', true, () => { this.detailTargetId = null; this.render(); }, 0x7f1d1d);
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
              '2. 繁育页只显示配对状态、风险带与费用，详细规则放在说明中。',
              '3. 委托页会显示目标卡片、风险与可执行操作，目标难度会影响线索、需求和报酬。',
              '4. 推进时间后可能触发事件，它们代表制造公司对赏金猎人、舆论和合法化推进的应对。',
              '5. 如果按钮不可点，通常是因为角色状态或资源尚未满足条件。'
            ];
    this.ui.push(
      this.add.rectangle(480, 270, 940, 500, 0x05030a, 0.8),
      this.add.rectangle(480, 270, 710, 390, 0x1a1222, 0.98).setStrokeStyle(2, 0x7e22ce),
      this.add.text(220, 100, title, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' })
    );
    lines.forEach((line, index) => {
      this.ui.push(this.add.text(220, 146 + index * 44, this.wrapUiText(line, 32), { fontSize: '13px', color: index % 2 === 0 ? '#f5d0fe' : '#bfdbfe' }));
    });
    this.button(642, 96, 46, 24, '关闭', true, () => { this.helpSection = null; this.render(); }, 0x7f1d1d);
  }

  private renderTraitDetail(): void {
    if (!this.traitDetail) return;
    const { trait, ownerName } = this.traitDetail;
    const stageLabel = trait.stage === 'innate' ? '先天特质' : '成长特质';
    this.ui.push(
      this.add.rectangle(480, 270, 940, 500, 0x05030a, 0.76),
      this.add.rectangle(480, 270, 520, 220, 0x181322, 0.98).setStrokeStyle(2, 0x8b5cf6),
      this.add.text(246, 180, `${ownerName} · ${trait.name}`, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(246, 214, stageLabel, { fontSize: '13px', color: '#c4b5fd', fontStyle: 'bold' }),
      this.add.text(246, 246, this.wrapUiText(trait.description, 26), { fontSize: '14px', color: '#e9d5ff' })
    );
    this.button(646, 180, 58, 22, '关闭', true, () => {
      this.traitDetail = null;
      this.render();
    }, 0x7f1d1d);
  }

  private renderEventModal(): void {
    if (!this.pendingEvent) return;
    const event = this.pendingEvent;
    const blocker = this.add.rectangle(480, 270, 960, 540, 0x04030a, 0.84).setInteractive();
    this.ui.push(blocker);
    this.ui.push(
      this.add.rectangle(480, 270, 700, 360, 0x181322, 0.98).setStrokeStyle(2, 0xf59e0b),
      this.add.text(180, 116, '实验室事件', { fontSize: '18px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(180, 148, event.title, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(180, 184, this.wrapUiText(event.body, 34), { fontSize: '14px', color: '#e9d5ff', lineSpacing: 4 })
    );
    event.options.forEach((option, index) => {
      const y = 280 + index * 64;
      this.ui.push(this.add.text(210, y - 20, this.wrapUiText(option.effectText, 28), { fontSize: '12px', color: '#cbd5e1' }));
      this.button(180, y, 520, 28, option.label, true, () => this.resolveEventOption(index), 0x7c3aed);
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
    const traits = [...card.innateTraits, ...card.growthTraits].slice(0, 3);
    if (!traits.length) {
      this.ui.push(this.add.text(x, y, '特质: 暂无', { fontSize: '10px', color: '#e9d5ff' }));
      return;
    }
    this.ui.push(this.add.text(x, y, '特质:', { fontSize: '10px', color: '#e9d5ff' }));
    traits.forEach((trait, index) => {
      const bx = x + 38 + index * 82;
      const bg = this.add.rectangle(bx + 34, y + 7, 68, 18, 0x3b2a55, 0.96).setStrokeStyle(1, 0xc4b5fd);
      const text = this.add.text(bx + 34, y + 7, trait.name, { fontSize: '9px', color: '#f5f3ff', fontStyle: 'bold' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.traitDetail = { trait, ownerName: card.name };
        this.render();
      });
      this.ui.push(bg, text);
    });
  }

  private renderStatBadges(stats: VisibleStats, x: number, y: number): void {
    const top = STAT_KEYS.slice(0, 4);
    const bottom = STAT_KEYS.slice(4);
    top.forEach((key, index) => {
      this.ui.push(this.add.text(x + index * 78, y, this.scoreLabel(key, stats[key]), { fontSize: '11px', color: STAT_COLORS[key], fontStyle: 'bold' }));
    });
    bottom.forEach((key, index) => {
      this.ui.push(this.add.text(x + index * 104, y + 14, this.scoreLabel(key, stats[key]), { fontSize: '11px', color: STAT_COLORS[key], fontStyle: 'bold' }));
    });
  }

  private renderCardButtons(card: LabCard, x: number, y: number): void {
    if (this.page === 'breed') {
      if (card.sex === '女') {
        this.button(x, y, 58, 18, this.motherId === card.id ? '取消母本' : (this.motherBlockedReason(card) ?? '选母本'), this.canToggleMother(card), () => this.toggleMother(card.id), 0x7c3aed);
        this.button(x + 64, y, 48, 18, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
        this.button(x + 116, y, 48, 18, '医护', this.canMedicate(card), () => this.medicateCard(card.id), 0x0f766e);
        this.button(x + 52, y + 24, 60, 18, '淘汰', !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
      } else {
        this.button(x, y, 58, 18, this.fatherCardId === card.id ? '取消父本' : (this.fatherBlockedReason(card) ?? '选父本'), this.canToggleFather(card), () => this.toggleFather(card.id), 0x1d4ed8);
        this.button(x + 64, y, 48, 18, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
        this.button(x + 116, y, 48, 18, '改名', card.isPlayerSelf, () => this.renameCard(card.id), 0x0f766e);
        this.button(x + 52, y + 24, 60, 18, card.isPlayerSelf ? '本人' : '淘汰', !card.isPlayerSelf && !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
      }
      return;
    }
    if (card.sex === '女') {
      this.button(x, y, 58, 18, this.assignmentCardId === card.id ? '取消特工' : (this.assignmentBlockedReason(card) ?? '选特工'), this.assignmentCardId === card.id || this.canSetAssignment(card), () => this.toggleAssignment(card.id), 0x047857);
      this.button(x + 64, y, 48, 18, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
      this.button(x + 116, y, 48, 18, '医护', this.canMedicate(card), () => this.medicateCard(card.id), 0x0f766e);
      this.button(x + 52, y + 24, 60, 18, '淘汰', !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
    } else {
      this.button(x + 64, y, 48, 18, '休整', this.canRest(card), () => this.restCard(card.id), 0x475569);
      this.button(x + 116, y, 48, 18, '改名', card.isPlayerSelf, () => this.renameCard(card.id), 0x0f766e);
      this.button(x + 52, y + 24, 60, 18, card.isPlayerSelf ? '本人' : '淘汰', !card.isPlayerSelf && !card.mission && !card.pregnancy, () => this.retireCard(card.id), 0x7f1d1d);
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
    return card.sex === '女' ? `${base} | 忠诚${card.loyalty}` : `${base} | 血系值${card.bloodlineValue}`;
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
  private breedingSummary(): { canBreed: boolean; cost: number; successBand: RiskBand; bloodlineRisk: RiskBand; gestationRisk: RiskBand; mentalRisk: '稳定' | '波动' | '高波动'; childTendency: string; bloodlineDetail: string } {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    const sample = this.sample(this.fatherSampleId);
    const cost = Math.max(6, 12 + (sample?.quality === 'S' ? 4 : sample?.quality === 'A' ? 2 : 0) + this.sumActiveEffect('breedingCostMod'));
    if (!mother || (!father && !sample)) return { canBreed: false, cost, successBand: '低', bloodlineRisk: '低', gestationRisk: '低', mentalRisk: '稳定', childTendency: '先完成父母选择', bloodlineDetail: '暂无配对' };
    const bloodline = father ? this.computeBloodlineRisk(mother, father) : { band: '低' as RiskBand, detail: '外部样本视为外源血线。', negativeBoost: 0 };
    const fec = this.pairValue(mother.breedingGenome.FEC) + this.pairValue((father?.breedingGenome ?? sample!.breedingGenome).FEC);
    const ges = this.pairValue(mother.breedingGenome.GES) + this.pairValue((father?.breedingGenome ?? sample!.breedingGenome).GES);
    const mnd = this.pairValue(mother.breedingGenome.MND) + this.pairValue((father?.breedingGenome ?? sample!.breedingGenome).MND);
    const healthPressure = mother.health < 68 ? 1 : 0;
    const successScore = fec + ges + Math.floor((mother.health - 50) / 12) - bloodline.negativeBoost - healthPressure;
    const gestationScore = ges + Math.floor((mother.visibleStats.constitution - 50) / 12) - bloodline.negativeBoost - (mother.lifeStage === 'declining' || mother.lifeStage === 'aging' ? 1 : 0);
    const successBand: RiskBand = successScore >= 5 ? '高' : successScore >= 2 ? '中' : successScore >= 0 ? '低' : '极高';
    const gestationRisk: RiskBand = gestationScore >= 5 ? '低' : gestationScore >= 2 ? '中' : gestationScore >= 0 ? '高' : '极高';
    const mentalRisk = mnd >= 4 && bloodline.negativeBoost === 0 ? '稳定' : mnd >= 0 ? '波动' : '高波动';
    const canBreed = this.money >= cost && this.isBreedingReady(mother) && (!!sample || (!!father && this.canSetFather(father)));
    return { canBreed, cost, successBand, bloodlineRisk: bloodline.band, gestationRisk, mentalRisk, childTendency: this.projectChildTendency(mother, father, sample).join(' / '), bloodlineDetail: bloodline.detail };
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
    const successThreshold = 38 + fecScore * 6 + Math.floor((mother.health - 60) / 4);
    if (Phaser.Math.Between(0, 100) > successThreshold) {
      this.pushLog(`${mother.name} 的本轮繁育未能启动：${this.breedingFailureReason(mother, father, sample, summary, fecScore)}。实验室只消耗了准备资源。`);
      this.render();
      return;
    }
    const children = this.rollChildren(mother, father, sample, summary.bloodlineRisk);
    mother.pregnancy = { children, fatherLabel: father?.name ?? sample!.name, daysRemaining: summary.gestationRisk === '极高' ? 5 : summary.gestationRisk === '高' ? 4 : 3, gestationRisk: summary.gestationRisk };
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
      if (child.expressedDefects.length) events.push(`${child.name} 初始可见缺陷: ${child.expressedDefects.join('、')}。`);
      if (child.innateTraits.length) events.push(`${child.name} 先天特质: ${child.innateTraits.map((trait) => trait.name).join('、')}。`);
    });
    return { children: pregnancy.children, events };
  }
  private createAdultCard(name: string, sex: Sex, generation: number, ageDays: number, statProfile: Record<StatKey, 'strong' | 'good' | 'balanced' | 'weak'>, breedingProfile: Record<BreedingGeneKey, 'strong' | 'good' | 'balanced' | 'weak'>, defectBias: 'low' | 'medium' | 'high', motherId: string | null = null, fatherId: string | null = null, isPlayerSelf = false): LabCard {
    const visibleGenome = this.makeVisibleGenome(statProfile);
    const breedingGenome = this.makeBreedingGenome(breedingProfile);
    const defectGenome = this.makeDefectGenome(defectBias);
    const card = this.createCardBase(name, sex, generation, ageDays, motherId, fatherId, visibleGenome, breedingGenome, defectGenome);
    card.isPlayerSelf = isPlayerSelf;
    this.revealGrowthTraits(card);
    return card;
  }

  private createChildCard(mother: LabCard, father: LabCard | null, sample: SampleCard | null, generation: number, bloodlineRisk: RiskBand): LabCard[] {
    const fatherGenome = father?.visibleGenome ?? sample!.visibleGenome;
    const fatherBreeding = father?.breedingGenome ?? sample!.breedingGenome;
    const fatherDefects = father?.defectGenome ?? sample!.defectGenome;
    const fatherId = father?.id ?? null;
    const riskBoost = bloodlineRisk === '极高' ? 2 : bloodlineRisk === '高' ? 1 : bloodlineRisk === '中' ? 1 : 0;
    const makeOne = (): LabCard => {
      const sex: Sex = Phaser.Math.Between(0, 1) === 0 ? '女' : '男';
      const genome = {} as VisibleGenome;
      const breeding = {} as BreedingGenome;
      const defects = {} as DefectGenome;
      STAT_KEYS.forEach((key) => { genome[key] = mother.visibleGenome[key].map((pair, index) => this.inheritGenePair(pair, fatherGenome[key][index])) as VisibleGenome[StatKey]; });
      BREEDING_GENE_KEYS.forEach((key) => { breeding[key] = this.inheritSimplePair(mother.breedingGenome[key], fatherBreeding[key]); });
      DEFECT_KEYS.forEach((key) => { defects[key] = this.inheritDefectPair(mother.defectGenome[key], fatherDefects[key], riskBoost); });
      return this.createCardBase(this.generateName(sex, genome, this.nextId++), sex, generation, 0, mother.id, fatherId, genome, breeding, defects);
    };
    const children = [makeOne()];
    const twinChance = this.pairValue(mother.breedingGenome.VAR) + this.pairValue(fatherBreeding.VAR) >= 5 ? 3 : 2;
    if (Phaser.Math.Between(0, 100) < twinChance) children.push(makeOne());
    return children;
  }

  private rollChildren(mother: LabCard, father: LabCard | null, sample: SampleCard | null, bloodlineRisk: RiskBand): LabCard[] { return this.createChildCard(mother, father, sample, Math.max(mother.generation, father?.generation ?? mother.generation) + 1, bloodlineRisk); }

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

  private createCardBase(name: string, sex: Sex, generation: number, ageDays: number, motherId: string | null, fatherId: string | null, visibleGenome: VisibleGenome, breedingGenome: BreedingGenome, defectGenome: DefectGenome): LabCard {
    const visibleStats = this.computeStats(visibleGenome);
    const expressedDefects = this.evaluateDefects(defectGenome, visibleStats);
    const innateTraits = this.generateInnateTraits(visibleStats, expressedDefects, breedingGenome);
    const pendingGrowthTraits = this.generateGrowthTraits(visibleStats, breedingGenome, expressedDefects);
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
      innateTraits,
      growthTraits: [],
      pendingGrowthTraits,
      tags: [],
      motherId,
      fatherId,
      grandparentIds: this.collectGrandparents(motherId, fatherId),
      lifespanPotential: this.computeLifespan(statsWithTraits.constitution, innateTraits, expressedDefects),
      agingWear: 0,
      protocolStability: Phaser.Math.Clamp(55 + Math.floor((statsWithTraits.stability - 50) / 2) + this.pairValue(breedingGenome.MND) * 4, 25, 100),
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

  private generateInnateTraits(stats: VisibleStats, defects: string[], breedingGenome: BreedingGenome): TraitEntry[] {
    const traits: TraitEntry[] = [];
    if (stats.appearance >= 82) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'photogenic')!));
    if (stats.eloquence >= 80) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'talkative')!));
    if (stats.gentleness >= 80) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'calmingPresence')!));
    if (stats.stability >= 80) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'emotionallyStable')!));
    if (stats.constitution >= 78) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'pressureResistant')!));
    if (stats.constitution >= 72 && this.pairValue(breedingGenome.HER) >= 1) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'longLivedTendency')!));
    if (defects.includes('体弱')) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'frailBody')!));
    if (defects.includes('亚生育')) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'subfertileBody')!));
    if (defects.includes('冷淡')) traits.push(this.toTrait(INNATE_TRAITS.find((trait) => trait.id === 'coldAffect')!));
    return this.uniqueTraits(traits).slice(0, 2);
  }

  private generateGrowthTraits(stats: VisibleStats, breedingGenome: BreedingGenome, defects: string[]): PendingGrowthTrait[] {
    const traits: PendingGrowthTrait[] = [];
    if (stats.stability >= 74) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'composedUnderPressure')!, AGE_MATURE_REVEAL));
    if (stats.eloquence >= 72 || stats.gentleness >= 72) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'socialInstinct')!, AGE_MATURE_REVEAL));
    if (this.pairValue(breedingGenome.MND) <= -1) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'overSensitive')!, AGE_GROWTH_REVEAL));
    if (this.pairValue(breedingGenome.MND) >= 2) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'bloodlineEcho')!, AGE_MATURE_REVEAL));
    if (this.pairValue(breedingGenome.VAR) >= 2) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'selfAwareness')!, AGE_MATURE_REVEAL));
    if (defects.includes('不稳')) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'protocolDrift')!, AGE_MATURE_REVEAL));
    if (stats.constitution >= 76) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'selfRepair')!, AGE_MATURE_REVEAL));
    if (stats.constitution <= 45) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'overworkSensitive')!, AGE_MATURE_REVEAL));
    if (stats.gentleness >= 68 && stats.stability >= 68) traits.push(this.toPendingTrait(GROWTH_TRAITS.find((trait) => trait.id === 'attachmentFormed')!, AGE_GROWTH_REVEAL));
    return this.uniquePendingTraits(traits).slice(0, 2);
  }

  private applyTraitEffects(stats: VisibleStats, traits: TraitEntry[]): VisibleStats {
    const result = { ...stats };
    traits.forEach((trait) => {
      const definition = [...INNATE_TRAITS, ...GROWTH_TRAITS].find((entry) => entry.id === trait.id);
      if (!definition?.statMods) return;
      Object.entries(definition.statMods).forEach(([key, value]) => { result[key as StatKey] = Phaser.Math.Clamp(result[key as StatKey] + (value ?? 0), 0, 100); });
    });
    return result;
  }
  private computeLifespan(constitution: number, traits: TraitEntry[], defects: string[]): number {
    let lifespan = 72 + Math.floor((constitution - 50) / 2);
    if (traits.some((trait) => trait.id === 'longLivedTendency')) lifespan += 18;
    if (traits.some((trait) => trait.id === 'frailBody')) lifespan -= 10;
    if (defects.includes('体弱')) lifespan -= 6;
    return Phaser.Math.Clamp(lifespan, 45, 120);
  }

  private computeBloodlineValue(stats: VisibleStats, traits: TraitEntry[], defects: string[], breedingGenome: BreedingGenome): number {
    const topStats = [...STAT_KEYS].sort((left, right) => stats[right] - stats[left]).slice(0, 3);
    let value = topStats.reduce((sum, key) => sum + Math.floor(stats[key] / 10), 0);
    value += this.pairValue(breedingGenome.HER) * 2 + this.pairValue(breedingGenome.FEC);
    value += traits.length * 3;
    value -= defects.length * 4;
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
    if (traits.some((trait) => trait.id === 'longLivedTendency')) tags.push('长线血系');
    if (traits.some((trait) => trait.id === 'emotionallyStable')) tags.push('心智稳');
    if (defects.length) tags.push('隐患血系');
    return tags.slice(0, 3);
  }

  private toTrait(definition: TraitDefinition): TraitEntry { return { id: definition.id, name: definition.name, stage: definition.stage, description: definition.description }; }
  private toPendingTrait(definition: TraitDefinition, revealAge: number): PendingGrowthTrait { return { ...this.toTrait(definition), revealAge }; }
  private uniqueTraits(traits: TraitEntry[]): TraitEntry[] { return traits.filter((trait, index) => traits.findIndex((entry) => entry.id === trait.id) === index); }
  private uniquePendingTraits(traits: PendingGrowthTrait[]): PendingGrowthTrait[] { return traits.filter((trait, index) => traits.findIndex((entry) => entry.id === trait.id) === index); }

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
      card.growthTraits.push({ id: trait.id, name: trait.name, stage: trait.stage, description: trait.description });
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
  private healthLossOnMission(card: LabCard): number { let loss = 2 + Math.max(0, 2 - Math.floor((card.visibleStats.constitution - 50) / 15)); if (this.hasTrait(card, 'pressureResistant')) loss -= 1; if (this.hasTrait(card, 'overworkSensitive')) loss += 1; if (card.expressedDefects.includes('体弱')) loss += 1; return Math.max(1, loss); }
  private healthLossOnPregnancy(card: LabCard): number { let loss = 2; if (card.expressedDefects.includes('亚生育') || card.expressedDefects.includes('体弱')) loss += 1; if (card.lifeStage === 'declining' || card.lifeStage === 'aging') loss += 1; return loss; }
  private passiveHealthRecovery(card: LabCard): number { let gain = 1 + this.sumActiveEffect('healthRecoveryDaily'); if (this.hasTrait(card, 'selfRepair')) gain += 1; if (card.expressedDefects.includes('体弱')) gain -= 1; return Math.max(0, gain); }
  private loyaltyLoss(card: LabCard): number { if (!card.mission) return 0; let loss = Math.max(1, card.mission.targetCharisma + card.mission.pressure - Math.floor((card.visibleStats.stability - 50) / 15)); if (this.hasTrait(card, 'composedUnderPressure')) loss -= 1; if (this.hasTrait(card, 'overSensitive')) loss += 1; if (card.expressedDefects.includes('依附脆弱')) loss += 1; if (this.hasTrait(card, 'coldAffect')) loss -= 1; return Math.max(1, loss); }
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
    if (this.hasTrait(card, 'talkative')) mod -= 4;
    if (this.hasTrait(card, 'calmingPresence')) mod -= 4;
    if (this.hasTrait(card, 'socialInstinct')) mod -= 5;
    if (this.hasTrait(card, 'overSensitive')) mod += 3;
    if (this.hasTrait(card, 'frailBody')) mod += 5;
    return mod;
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

  private breedingFailureReason(mother: LabCard, father: LabCard | null, sample: SampleCard | null, summary: { bloodlineRisk: RiskBand; gestationRisk: RiskBand; mentalRisk: '稳定' | '波动' | '高波动' }, fecScore: number): string {
    const reasons: string[] = [];
    if (mother.health < 70) reasons.push('母体健康储备不足');
    if (mother.stamina < 65) reasons.push('母体体力恢复不够');
    if (fecScore <= 0) reasons.push('配对繁殖力偏低');
    else if (fecScore <= 2) reasons.push('繁殖力只在临界线附近');
    if (summary.bloodlineRisk === '高' || summary.bloodlineRisk === '极高') reasons.push('血系压力过高');
    if (summary.gestationRisk === '高' || summary.gestationRisk === '极高') reasons.push('孕程稳定性不足');
    if (summary.mentalRisk === '高波动') reasons.push('心智波动过强');
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
      defectGenome: this.makeDefectGenome(quality === 'S' ? 'low' : 'medium')
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
  private inRoster(x: number, y: number): boolean { return x >= 18 && x <= 642 && y >= 104 && y <= ROSTER_VIEW_BOTTOM; }
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
  private inMonitor(x: number, y: number): boolean { return x >= 690 && x <= 918 && y >= 90 && y <= 318; }
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
