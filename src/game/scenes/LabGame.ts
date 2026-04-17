import Phaser from 'phaser';

type TraitKey = 'LOOK' | 'FIGURE' | 'AURA' | 'TENDER' | 'TALK' | 'STABLE';
type DefectKey = 'FRAIL' | 'COLD' | 'LOW_FERTILITY';
type GenePair = [string, string];
type TraitGenes = Record<TraitKey, GenePair>;
type HiddenGenes = Record<DefectKey, GenePair>;
type Sex = '女' | '男';

type Clue = {
  id: string;
  title: string;
  text: string;
  cost: number;
  unlocked: boolean;
};

type Card = {
  id: string;
  name: string;
  sex: Sex;
  generation: number;
  chromosomes: 'XX' | 'XY';
  parentAId: string | null;
  parentBId: string | null;
  traitGenes: TraitGenes;
  hiddenGenes: HiddenGenes;
  stamina: number;
  maxStamina: number;
  loyalty: number;
  maxLoyalty: number;
  defects: string[];
  tags: string[];
  mission: ActiveMission | null;
  pregnancy: PendingChild | null;
};

type Sample = {
  id: string;
  name: string;
  source: string;
  traitGenes: TraitGenes;
  hiddenGenes: HiddenGenes;
};

type Client = {
  id: string;
  name: string;
  title: string;
  objective: string;
  briefing: string;
  prefs: TraitKey[];
  objectiveTraits: TraitKey[];
  reward: number;
  sampleChance: number;
  difficulty: number;
  durationDays: number;
  charisma: number;
  clues: Clue[];
  assignedCardId: string | null;
  daysRemaining: number;
  failureRisk: number;
};

type Risk = { label: '低' | '中' | '高' | '极高'; detail: string; color: string };

type ActiveMission = {
  missionId: string;
  targetLabel: string;
  objective: string;
  daysRemaining: number;
  reward: number;
  sampleChance: number;
  difficulty: number;
  prefs: TraitKey[];
  objectiveTraits: TraitKey[];
  charisma: number;
  failureRisk: number;
};

type PendingChild = {
  child: Card;
  fatherLabel: string;
  daysRemaining: number;
};

const TRAITS: TraitKey[] = ['LOOK', 'FIGURE', 'AURA', 'TENDER', 'TALK', 'STABLE'];
const DEFECTS: DefectKey[] = ['FRAIL', 'COLD', 'LOW_FERTILITY'];
const DOM: Record<TraitKey | DefectKey, string> = {
  LOOK: 'L', FIGURE: 'F', AURA: 'A', TENDER: 'T', TALK: 'K', STABLE: 'S', FRAIL: 'X', COLD: 'Y', LOW_FERTILITY: 'Z'
};
const LABELS: Record<TraitKey, string> = {
  LOOK: '容貌', FIGURE: '身姿', AURA: '气质', TENDER: '温柔', TALK: '健谈', STABLE: '稳定'
};

export class LabGameScene extends Phaser.Scene {
  private page: 'breed' | 'service' = 'breed';
  private rosterTab: 'female' | 'male' | 'sample' = 'female';
  private day = 1;
  private credits = 36;
  private exposureRisk = 0;
  private readonly breedCostBase = 12;
  private readonly restCost = 2;
  private readonly comfortCost = 3;
  private readonly clueRefreshCost = 3;
  private readonly rosterCap = 14;
  private roster: Card[] = [];
  private samples: Sample[] = [];
  private clients: Client[] = [];
  private motherId: string | null = null;
  private fatherCardId: string | null = null;
  private fatherSampleId: string | null = null;
  private serviceId: string | null = null;
  private revealId: string | null = null;
  private detailClientId: string | null = null;
  private log: string[] = [];
  private ui: Phaser.GameObjects.GameObject[] = [];
  private nextId = 6;
  private breedings = 0;
  private services = 0;
  private samplesEarned = 0;
  private rosterScroll = 0;
  private rosterDragStartY = 0;
  private rosterScrollStart = 0;
  private dragging = false;
  private helpOpen = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120c18');
    this.seed();
    this.drawShell();
    this.setupRosterDragging();
    this.render();
  }

  private seed(): void {
    this.roster = [
      this.makeCard('绮宁1号', '女', 1, null, null, { LOOK: ['L', 'L'], FIGURE: ['F', 'f'], AURA: ['A', 'A'], TENDER: ['T', 't'], TALK: ['K', 'k'], STABLE: ['S', 'S'] }, { FRAIL: ['X', 'x'], COLD: ['Y', 'Y'], LOW_FERTILITY: ['Z', 'Z'] }),
      this.makeCard('柔辞2号', '女', 1, null, null, { LOOK: ['L', 'l'], FIGURE: ['F', 'F'], AURA: ['A', 'a'], TENDER: ['T', 'T'], TALK: ['K', 'k'], STABLE: ['S', 's'] }, { FRAIL: ['X', 'X'], COLD: ['Y', 'y'], LOW_FERTILITY: ['Z', 'z'] }),
      this.makeCard('澜语3号', '女', 1, null, null, { LOOK: ['L', 'l'], FIGURE: ['F', 'f'], AURA: ['A', 'A'], TENDER: ['T', 't'], TALK: ['K', 'K'], STABLE: ['S', 's'] }, { FRAIL: ['X', 'X'], COLD: ['Y', 'Y'], LOW_FERTILITY: ['Z', 'z'] }),
      this.makeCard('曜仪4号', '男', 1, null, null, { LOOK: ['L', 'L'], FIGURE: ['F', 'F'], AURA: ['A', 'a'], TENDER: ['T', 't'], TALK: ['K', 'k'], STABLE: ['S', 'S'] }, { FRAIL: ['X', 'x'], COLD: ['Y', 'y'], LOW_FERTILITY: ['Z', 'Z'] }),
      this.makeCard('言序5号', '男', 1, null, null, { LOOK: ['L', 'l'], FIGURE: ['F', 'f'], AURA: ['A', 'A'], TENDER: ['T', 'T'], TALK: ['K', 'K'], STABLE: ['S', 's'] }, { FRAIL: ['X', 'X'], COLD: ['Y', 'Y'], LOW_FERTILITY: ['Z', 'z'] })
    ];
    this.samples = [
      this.makeSample('授权样本-安谈', '首席顾问', { LOOK: ['L', 'l'], FIGURE: ['F', 'F'], AURA: ['A', 'a'], TENDER: ['T', 'T'], TALK: ['K', 'K'], STABLE: ['S', 's'] }, { FRAIL: ['X', 'X'], COLD: ['Y', 'Y'], LOW_FERTILITY: ['Z', 'Z'] })
    ];
    this.clients = [this.makeClient(), this.makeClient()];
    this.pushLog('女性卡负责潜入委托，男性卡或带回样本负责父系繁育。');
    this.pushLog('推进一天会结算忠诚变化、失败风险、怀孕进度和委托天数。');
  }

  private drawShell(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x120c18);
    this.add.rectangle(width / 2, 34, width - 20, 54, 0x23162d, 0.95).setStrokeStyle(2, 0x5c3b6b);
    this.add.rectangle(330, 292, 620, 458, 0x1b1323, 0.94).setStrokeStyle(2, 0x654578);
    this.add.rectangle(814, 186, 262, 250, 0x1a1222, 0.95).setStrokeStyle(2, 0x72508a);
    this.add.rectangle(814, 431, 262, 244, 0x1a1222, 0.95).setStrokeStyle(2, 0x72508a);
    this.add.text(132, 18, '生化人陪伴育成所', { fontSize: '20px', color: '#fff7fb', fontStyle: 'bold' });
    this.add.text(24, 70, '角色卡库', { fontSize: '18px', color: '#f5d0fe', fontStyle: 'bold' });
    this.add.text(690, 70, '实验室显示屏', { fontSize: '17px', color: '#f5d0fe', fontStyle: 'bold' });
    this.add.text(690, 316, '主操作区', { fontSize: '17px', color: '#f5d0fe', fontStyle: 'bold' });
  }

  private setupRosterDragging(): void {
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _t: unknown, _dx: number, dy: number) => {
      if (!this.inRoster(pointer.x, pointer.y)) return;
      this.rosterScroll = this.clampScroll(this.rosterScroll + dy * 0.8);
      this.render();
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inRoster(pointer.x, pointer.y)) return;
      this.dragging = true;
      this.rosterDragStartY = pointer.y;
      this.rosterScrollStart = this.rosterScroll;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.rosterScroll = this.clampScroll(this.rosterScrollStart - (pointer.y - this.rosterDragStartY));
      this.render();
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
    });
    this.input.on('pointerupoutside', () => {
      this.dragging = false;
    });
  }

  private render(): void {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
    this.renderHeader();
    this.renderRosterTabs();
    this.renderRoster();
    this.renderMonitor();
    this.renderRightPanel();
    if (this.detailClientId) this.renderMissionDetail();
    if (this.helpOpen) this.renderHelp();
  }

  private renderHeader(): void {
    this.ui.push(
      this.add.text(24, 486, `容量 ${this.roster.length}/${this.rosterCap} | 当前页 ${this.page === 'breed' ? '繁育' : '接待'} | 休整 ${this.restCost}资金 | 安抚 ${this.comfortCost}资金`, { fontSize: '13px', color: '#c4b5fd' })
    );
    this.button(24, 12, 92, 26, '推进一天', true, () => this.advanceDay(), 0x6d28d9);
    this.button(900, 12, 32, 26, '?', !this.helpOpen, () => {
      this.helpOpen = true;
      this.render();
    }, 0x4c1d95);
  }

  private renderRosterTabs(): void {
    this.button(24, 98, 72, 22, '女性', this.rosterTab !== 'female', () => {
      this.rosterTab = 'female';
      this.rosterScroll = 0;
      this.render();
    }, 0x7c3aed);
    this.button(104, 98, 72, 22, '男性', this.rosterTab !== 'male', () => {
      this.rosterTab = 'male';
      this.rosterScroll = 0;
      this.render();
    }, 0x1d4ed8);
    this.button(184, 98, 92, 22, '带回样本', this.rosterTab !== 'sample', () => {
      this.rosterTab = 'sample';
      this.rosterScroll = 0;
      this.render();
    }, 0x0f766e);
  }

  private renderMonitor(): void {
    const activeMissions = this.clients.filter((client) => this.isClientActive(client)).length;
    const pregnancies = this.roster.filter((card) => card.pregnancy).length;
    const recent = this.log.slice(0, 5);
    const screenX = 690;
    const screenY = 98;

    this.ui.push(
      this.add.rectangle(814, 190, 228, 168, 0x0b1319, 0.98).setStrokeStyle(2, 0x38bdf8),
      this.add.text(screenX + 8, screenY + 4, '系统状态', { fontSize: '13px', color: '#67e8f9', fontStyle: 'bold' }),
      this.add.text(screenX + 8, screenY + 26, `日期: 第 ${this.day} 天`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 42, `资金: ${this.credits} | 样本: ${this.samples.length}`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 58, `潜入中: ${activeMissions} | 怀孕中: ${pregnancies}`, { fontSize: '11px', color: '#a5f3fc' }),
      this.add.text(screenX + 8, screenY + 74, `暴露风险: ${this.exposureRisk}/100`, { fontSize: '11px', color: this.exposureRisk >= 70 ? '#fb7185' : '#fca5a5' }),
      this.add.text(screenX + 8, screenY + 96, '近期事件', { fontSize: '12px', color: '#67e8f9', fontStyle: 'bold' })
    );

    recent.forEach((entry, index) => {
      this.ui.push(this.add.text(screenX + 8, screenY + 112 + index * 10, `> ${entry}`, { fontSize: '8px', color: '#d8f9ff', wordWrap: { width: 204 } }));
    });
  }

  private renderRoster(): void {
    const width = 620;
    const height = 118;
    const startX = 18;
    const startY = 128;
    const gapY = 8;
    const bottom = 432;
    this.rosterScroll = this.clampScroll(this.rosterScroll);
    if (this.rosterTab === 'sample') {
      this.renderSampleRoster(startX, startY, width, height, gapY, bottom);
      return;
    }

    this.filteredRoster().forEach((card, index) => {
      const x = startX;
      const y = startY + index * (height + gapY) - this.rosterScroll;
      if (y < startY || y + height > bottom) return;
      const mother = this.motherId === card.id;
      const father = this.fatherCardId === card.id;
      const service = this.serviceId === card.id;
      const reveal = this.revealId === card.id;
      let fill = card.sex === '女' ? 0x2a1631 : 0x142133;
      let stroke = card.sex === '女' ? 0xf472b6 : 0x60a5fa;
      if (card.defects.length) {
        fill = 0x32131c;
        stroke = 0xfb7185;
      }
      if (service) {
        fill = 0x23311d;
        stroke = 0x86efac;
      }
      if (mother || father) {
        fill = mother ? 0x3b1d3f : 0x1f2f4b;
        stroke = mother ? 0xf0abfc : 0x93c5fd;
      }
      if (reveal) {
        fill = 0x3a2b13;
        stroke = 0xfacc15;
      }
      this.ui.push(this.add.rectangle(x + width / 2, y + height / 2, width, height, fill, 0.97).setStrokeStyle(2, stroke));
      this.avatar(card, x + 42, y + 42);

      const infoLine = card.sex === '女'
        ? `${card.sex}性 | ${card.chromosomes} | 体力 ${card.stamina}/${card.maxStamina} | 忠诚 ${card.loyalty}/${card.maxLoyalty}`
        : `${card.sex}性 | ${card.chromosomes} | 体力 ${card.stamina}/${card.maxStamina}`;

      this.ui.push(
        this.add.text(x + 84, y + 10, `${card.name} 第${card.generation}代`, { fontSize: '15px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(x + 84, y + 28, infoLine, { fontSize: '10px', color: card.sex === '女' ? '#f9a8d4' : '#7dd3fc' }),
        this.add.text(x + 84, y + 46, `${this.cardStatus(card)} | ${card.tags.join(' | ')}`, { fontSize: '10px', color: '#fde68a', wordWrap: { width: 338 } }),
        this.add.text(x + 84, y + 92, `缺陷: ${card.defects.length ? card.defects.join('、') : '无'}`, { fontSize: '10px', color: card.defects.length ? '#fda4af' : '#cbd5e1', wordWrap: { width: 352 } })
      );
      this.traitBadges(card.traitGenes, x + 84, y + 64);

      if (mother) this.ui.push(this.add.text(x + 542, y + 10, '母本', { fontSize: '12px', color: '#f5d0fe', fontStyle: 'bold' }));
      else if (father) this.ui.push(this.add.text(x + 542, y + 10, '父本', { fontSize: '12px', color: '#bfdbfe', fontStyle: 'bold' }));
      else if (service) this.ui.push(this.add.text(x + 526, y + 10, '候选特工', { fontSize: '12px', color: '#bbf7d0', fontStyle: 'bold' }));
      if (this.page === 'breed') {
        if (card.sex === '女') {
          this.button(x + 448, y + 32, 72, 20, mother ? '取消母本' : '选母本', card.pregnancy === null && card.mission === null, () => this.setMother(card.id), 0x7c3aed);
          this.button(x + 526, y + 32, 72, 20, '休整', this.canRest(card), () => this.rest(card.id), 0x475569);
          this.button(x + 486, y + 56, 56, 20, '安抚', this.canComfort(card), () => this.comfort(card.id), 0x0f766e);
          this.button(x + 546, y + 56, 52, 20, '淘汰', true, () => this.retire(card.id), 0x7f1d1d);
        } else {
          this.button(x + 448, y + 32, 72, 20, father ? '取消父本' : '选父本', card.mission === null, () => this.setFatherCard(card.id), 0x1d4ed8);
          this.button(x + 526, y + 32, 72, 20, '休整', this.canRest(card), () => this.rest(card.id), 0x475569);
          this.button(x + 546, y + 56, 52, 20, '淘汰', true, () => this.retire(card.id), 0x7f1d1d);
        }
      } else {
        if (card.sex === '女') {
          this.button(x + 448, y + 32, 72, 20, service ? '取消特工' : '选特工', card.stamina >= 2 && card.mission === null && card.pregnancy === null, () => this.setService(card.id), 0x047857);
          this.button(x + 526, y + 32, 72, 20, '休整', this.canRest(card), () => this.rest(card.id), 0x475569);
          this.button(x + 486, y + 56, 56, 20, '安抚', this.canComfort(card), () => this.comfort(card.id), 0x0f766e);
          this.button(x + 546, y + 56, 52, 20, '淘汰', true, () => this.retire(card.id), 0x7f1d1d);
        } else {
          this.button(x + 526, y + 32, 72, 20, '休整', this.canRest(card), () => this.rest(card.id), 0x475569);
          this.button(x + 546, y + 56, 52, 20, '淘汰', true, () => this.retire(card.id), 0x7f1d1d);
        }
      }
    });
  }

  private renderSampleRoster(startX: number, startY: number, width: number, height: number, gapY: number, bottom: number): void {
    this.samples.forEach((sample, index) => {
      const x = startX;
      const y = startY + index * (height + gapY) - this.rosterScroll;
      if (y < startY || y + height > bottom) return;

      const active = this.fatherSampleId === sample.id;
      this.ui.push(this.add.rectangle(x + width / 2, y + height / 2, width, height, active ? 0x15314a : 0x132430, 0.97).setStrokeStyle(2, active ? 0x93c5fd : 0x38bdf8));
      this.ui.push(
        this.add.text(x + 24, y + 14, sample.name, { fontSize: '15px', color: '#e0f2fe', fontStyle: 'bold' }),
        this.add.text(x + 24, y + 36, `来源: ${sample.source}`, { fontSize: '10px', color: '#93c5fd', wordWrap: { width: 360 } }),
        this.add.text(x + 24, y + 54, '外部父系样本。可与女性角色繁育，父方随机给 X 或 Y。', { fontSize: '10px', color: '#bfdbfe', wordWrap: { width: 390 } })
      );
      this.traitBadges(sample.traitGenes, x + 24, y + 82);
      if (this.page === 'breed') {
        this.button(x + 474, y + 34, 96, 24, active ? '取消样本' : '选为父本', true, () => this.setFatherSample(sample.id), 0x1d4ed8);
      }
    });
  }

  private renderBreedPanel(): void {
    const mother = this.card(this.motherId);
    const fatherCard = this.card(this.fatherCardId);
    const fatherSample = this.sample(this.fatherSampleId);
    const risk = this.getRisk();

    this.ui.push(
      this.add.text(690, 372, '繁育台', { fontSize: '13px', color: '#f5d0fe', fontStyle: 'bold' }),
      this.add.text(690, 394, '母本', { fontSize: '11px', color: '#d8b4fe' }),
      this.add.text(728, 394, mother ? `${mother.name} | 体力${mother.stamina} | 忠诚${mother.loyalty}` : '请在左侧女性页签中选择', { fontSize: '10px', color: mother ? '#f5d0fe' : '#94a3b8', wordWrap: { width: 168 } }),
      this.add.text(690, 420, '父本', { fontSize: '11px', color: '#93c5fd' }),
      this.add.text(728, 420, fatherCard ? `${fatherCard.name} | 体力${fatherCard.stamina}` : fatherSample ? fatherSample.name : '请在男性或样本页签中选择', { fontSize: '10px', color: fatherCard || fatherSample ? '#dbeafe' : '#94a3b8', wordWrap: { width: 168 } }),
      this.add.text(690, 446, `风险: ${risk.label}`, { fontSize: '14px', color: risk.color, fontStyle: 'bold' }),
      this.add.text(690, 464, risk.detail, { fontSize: '9px', color: '#e9d5ff', wordWrap: { width: 198 } }),
      this.add.text(690, 492, `费用: ${this.breedCost()} 资金`, { fontSize: '11px', color: '#fde68a', fontStyle: 'bold' }),
      this.add.text(690, 506, 'XY: 母方给 X，父方给 X 或 Y。', { fontSize: '9px', color: '#fde68a', wordWrap: { width: 196 } }),
      this.add.text(690, 518, '怀孕后不会立刻生出子代，需要等待数天。', { fontSize: '9px', color: '#fde68a', wordWrap: { width: 196 } })
    );

    this.button(690, 544, 92, 22, '清空选择', !!this.motherId || !!this.fatherCardId || !!this.fatherSampleId, () => {
      this.motherId = null;
      this.fatherCardId = null;
      this.fatherSampleId = null;
      this.pushLog('繁育选择已清空。');
      this.render();
    }, 0x475569);
    this.button(794, 544, 92, 22, '确认繁育', this.canBreed(), () => this.breed(), 0x7c3aed);
  }

  private renderClientPanel(): void {
    const host = this.card(this.serviceId);
    this.ui.push(
      this.add.text(690, 372, '潜入台', { fontSize: '13px', color: '#bbf7d0', fontStyle: 'bold' }),
      this.add.text(690, 390, `当前候选特工: ${host ? `${host.name} | 体力${host.stamina} | 忠诚${host.loyalty}` : '请在左侧女性页签中选择一位空闲角色'}`, { fontSize: '10px', color: host ? '#dcfce7' : '#94a3b8', wordWrap: { width: 196 } })
    );

    this.clients.forEach((client, i) => {
      const y = 410 + i * 70;
      const active = this.isClientActive(client);
      const assigned = this.card(client.assignedCardId);
      this.ui.push(
        this.add.rectangle(814, y + 24, 228, 60, active ? 0x1d2f2a : 0x24152b, 0.98).setStrokeStyle(1, active ? 0x10b981 : 0x047857),
        this.add.text(698, y + 2, `${client.name} · ${client.title}`, { fontSize: '11px', color: '#fff7fb', fontStyle: 'bold' }),
        this.add.text(698, y + 16, client.objective, { fontSize: '9px', color: '#fde68a', wordWrap: { width: 128 } })
      );

      if (active) {
        this.ui.push(
          this.add.text(698, y + 34, `${assigned?.name ?? '失联'} | 剩余${client.daysRemaining}天`, { fontSize: '9px', color: '#bbf7d0' }),
          this.add.text(698, y + 46, `失败风险 ${Math.round(client.failureRisk)}%`, { fontSize: '9px', color: client.failureRisk >= 60 ? '#fb7185' : '#bfdbfe' })
        );
      } else {
        this.ui.push(this.add.text(698, y + 34, client.briefing, { fontSize: '9px', color: '#bfdbfe', wordWrap: { width: 126 } }));
      }

      this.button(830, y + 4, 34, 18, '详情', true, () => this.openClientDetail(client.id), 0x6d28d9);
      this.button(868, y + 4, 24, 18, '换', !active && this.credits >= this.clueRefreshCost, () => this.swapClient(client.id), 0x0f766e);
      this.button(830, y + 30, 62, 18, active ? '进行中' : '派出', !active && this.canServe(client.id), () => this.assignMission(client.id), 0x047857);
    });
  }

  private renderRightPanel(): void {
    this.button(690, 340, 92, 22, '繁育页', this.page !== 'breed', () => {
      this.page = 'breed';
      this.render();
    }, 0x7c3aed);
    this.button(792, 340, 92, 22, '接待页', this.page !== 'service', () => {
      this.page = 'service';
      this.render();
    }, 0x047857);

    if (this.page === 'breed') {
      this.renderBreedPanel();
      return;
    }

    this.renderClientPanel();
  }

  private renderMissionDetail(): void {
    const client = this.client(this.detailClientId);
    if (!client) {
      this.detailClientId = null;
      return;
    }

    const assigned = this.card(client.assignedCardId);
    this.ui.push(
      this.add.rectangle(480, 270, 940, 500, 0x05030a, 0.8),
      this.add.rectangle(480, 270, 720, 400, 0x16111e, 0.98).setStrokeStyle(2, 0x14b8a6),
      this.add.text(150, 92, `${client.name} · ${client.title}`, { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(150, 126, `任务: ${client.objective}`, { fontSize: '14px', color: '#fde68a' }),
      this.add.text(150, 150, `公开简报: ${client.briefing}`, { fontSize: '13px', color: '#bfdbfe', wordWrap: { width: 560 } }),
      this.add.text(150, 184, `目标魅力压迫: ${this.charismaLabel(client.charisma)} | 基础报酬 ${client.reward} | 样本概率 ${Math.round(client.sampleChance * 100)}%`, { fontSize: '12px', color: '#a7f3d0', wordWrap: { width: 560 } })
    );

    if (this.isClientActive(client)) {
      this.ui.push(
        this.add.text(150, 210, `当前潜入者: ${assigned?.name ?? '失联'} | 剩余 ${client.daysRemaining} 天 | 失败风险 ${Math.round(client.failureRisk)}%`, { fontSize: '12px', color: '#fca5a5', wordWrap: { width: 560 } })
      );
    }

    client.clues.forEach((clue, index) => {
      const y = 244 + index * 56;
      this.ui.push(
        this.add.rectangle(396, y + 18, 500, 42, 0x0b1319, 0.94).setStrokeStyle(1, 0x38bdf8),
        this.add.text(164, y + 4, clue.title, { fontSize: '12px', color: '#67e8f9', fontStyle: 'bold' })
      );
      if (clue.unlocked) {
        this.ui.push(this.add.text(164, y + 20, clue.text, { fontSize: '11px', color: '#e0f2fe', wordWrap: { width: 420 } }));
      } else {
        this.ui.push(this.add.text(164, y + 20, '??? 未知线索，支付资金后解锁。', { fontSize: '11px', color: '#94a3b8' }));
        this.button(590, y + 8, 86, 20, `解锁 ${clue.cost}`, this.credits >= clue.cost && !this.isClientActive(client), () => this.unlockClue(client.id, clue.id), 0x0f766e);
      }
    });

    this.button(730, 108, 56, 22, '关闭', true, () => {
      this.detailClientId = null;
      this.render();
    }, 0x7f1d1d);
  }
  private renderHelp(): void {
    this.ui.push(
      this.add.rectangle(480, 270, 940, 500, 0x05030a, 0.8),
      this.add.rectangle(480, 270, 700, 388, 0x1a1222, 0.98).setStrokeStyle(2, 0x7e22ce),
      this.add.text(220, 104, '育成所说明', { fontSize: '22px', color: '#fff7fb', fontStyle: 'bold' }),
      this.add.text(220, 146, '1. 女性卡执行潜入委托并承担怀孕过程，男性卡或带回样本作为父系来源。', { fontSize: '14px', color: '#f5d0fe', wordWrap: { width: 520 } }),
      this.add.text(220, 192, '2. 委托详情里有多条线索，部分需要花资金解锁。任务进行中时，委托卡仍会显示并持续更新失败风险。', { fontSize: '14px', color: '#bfdbfe', wordWrap: { width: 520 } }),
      this.add.text(220, 238, '3. 每推进一天，目标魅力会消耗特工忠诚。忠诚归零会叛逃并提高实验室暴露风险。', { fontSize: '14px', color: '#fde68a', wordWrap: { width: 520 } }),
      this.add.text(220, 284, '4. 暴露风险达到 100 即宣告实验室失败。休整可回体力，安抚可恢复忠诚。', { fontSize: '14px', color: '#fda4af', wordWrap: { width: 520 } }),
      this.add.text(220, 330, '5. 繁育遵循 XY 规则，近亲风险主要通过隐性缺陷体现，而不是统一数值惩罚。', { fontSize: '14px', color: '#f5d0fe', wordWrap: { width: 520 } })
    );
    this.button(634, 96, 46, 26, '关闭', true, () => {
      this.helpOpen = false;
      this.render();
    }, 0x7f1d1d);
  }

  private setMother(id: string): void {
    const card = this.card(id);
    if (!card || card.sex !== '女') return;
    this.motherId = this.motherId === id ? null : id;
    this.pushLog(this.motherId === id ? `${card.name} 已设为母本。` : `${card.name} 已取消母本。`);
    this.render();
  }

  private setFatherCard(id: string): void {
    const card = this.card(id);
    if (!card || card.sex !== '男') return;
    if (this.fatherCardId === id) {
      this.fatherCardId = null;
      this.pushLog(`${card.name} 已取消父本。`);
    } else {
      this.fatherCardId = id;
      this.fatherSampleId = null;
      this.pushLog(`${card.name} 已设为父本。`);
    }
    this.render();
  }

  private setFatherSample(id: string): void {
    const sample = this.sample(id);
    if (!sample) return;
    if (this.fatherSampleId === id) {
      this.fatherSampleId = null;
      this.pushLog(`${sample.name} 已取消选中。`);
    } else {
      this.fatherSampleId = id;
      this.fatherCardId = null;
      this.pushLog(`${sample.name} 已作为父系样本待命。`);
    }
    this.render();
  }

  private setService(id: string): void {
    const card = this.card(id);
    if (!card || card.sex !== '女' || card.mission || card.pregnancy) return;
    this.serviceId = this.serviceId === id ? null : id;
    this.pushLog(this.serviceId === id ? `${card.name} 已指定为潜入特工。` : `${card.name} 已取消潜入选择。`);
    this.render();
  }

  private canRest(card: Card): boolean {
    return card.mission === null && (card.stamina < card.maxStamina || (card.sex === '女' && card.loyalty < card.maxLoyalty)) && this.credits >= this.restCost;
  }

  private rest(id: string): void {
    const card = this.card(id);
    if (!card || !this.canRest(card)) return;
    card.stamina = card.maxStamina;
    if (card.sex === '女') {
      card.loyalty = Math.min(card.maxLoyalty, card.loyalty + 1);
    }
    this.credits -= this.restCost;
    this.pushLog(`${card.name} 休整完成，体力恢复，忠诚稍有回升。`);
    this.render();
  }

  private canComfort(card: Card): boolean {
    return card.sex === '女' && card.mission === null && card.loyalty < card.maxLoyalty && this.credits >= this.comfortCost;
  }

  private comfort(id: string): void {
    const card = this.card(id);
    if (!card || !this.canComfort(card)) return;
    card.loyalty = card.maxLoyalty;
    this.credits -= this.comfortCost;
    this.pushLog(`${card.name} 完成安抚，忠诚恢复至稳定区间。`);
    this.render();
  }

  private retire(id: string): void {
    const card = this.card(id);
    if (!card) return;
    if (card.mission) {
      const client = this.client(card.mission.missionId);
      if (client) this.resetClient(client, false);
    }
    this.roster = this.roster.filter((entry) => entry.id !== id);
    if (this.motherId === id) this.motherId = null;
    if (this.fatherCardId === id) this.fatherCardId = null;
    if (this.serviceId === id) this.serviceId = null;
    if (this.revealId === id) this.revealId = null;
    this.credits += 4;
    this.pushLog(`${card.name} 已淘汰，回收 4 资金。`);
    if (!this.roster.length) {
      this.scene.start('GameOver', { credits: this.credits, totalBreedings: this.breedings, totalServices: this.services, sampleCount: this.samples.length, rosterSize: 0, reason: '育成所内已经没有可用角色卡。' });
      return;
    }
    this.render();
  }

  private canServe(id: string): boolean {
    const host = this.card(this.serviceId);
    const client = this.client(id);
    return !!host && !!client && !this.isClientActive(client) && host.sex === '女' && host.stamina >= 2 && host.mission === null && host.pregnancy === null;
  }

  private assignMission(id: string): void {
    const host = this.card(this.serviceId);
    const client = this.client(id);
    if (!host || !client || !this.canServe(id)) return;

    host.stamina = Math.max(0, host.stamina - 2);
    const risk = this.computeFailureRisk(host, client);
    host.mission = {
      missionId: client.id,
      targetLabel: `${client.name} · ${client.title}`,
      objective: client.objective,
      daysRemaining: client.durationDays,
      reward: client.reward,
      sampleChance: client.sampleChance,
      difficulty: client.difficulty,
      prefs: client.prefs,
      objectiveTraits: client.objectiveTraits,
      charisma: client.charisma,
      failureRisk: risk
    };
    client.assignedCardId = host.id;
    client.daysRemaining = client.durationDays;
    client.failureRisk = risk;
    this.serviceId = null;
    this.pushLog(`${host.name} 已潜入 ${host.mission.targetLabel} 身边，目标是${client.objective}。`);
    this.render();
  }

  private swapClient(id: string): void {
    const index = this.clients.findIndex((client) => client.id === id);
    if (index < 0 || this.isClientActive(this.clients[index]) || this.credits < this.clueRefreshCost) return;
    this.credits -= this.clueRefreshCost;
    this.clients[index] = this.makeClient();
    this.pushLog('已通过渠道刷新一项新委托。');
    this.render();
  }

  private openClientDetail(id: string): void {
    this.detailClientId = id;
    this.render();
  }

  private unlockClue(clientId: string, clueId: string): void {
    const client = this.client(clientId);
    const clue = client?.clues.find((entry) => entry.id === clueId);
    if (!client || !clue || clue.unlocked || this.credits < clue.cost) return;
    this.credits -= clue.cost;
    clue.unlocked = true;
    this.pushLog(`已买通线人，解锁 ${client.name} 的一条线索。`);
    this.render();
  }

  private canBreed(): boolean {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    return !!mother
      && mother.sex === '女'
      && mother.stamina >= 2
      && mother.pregnancy === null
      && mother.mission === null
      && this.credits >= this.breedCost()
      && this.roster.length < this.rosterCap
      && ((!!father && father.sex === '男' && father.stamina >= 1 && father.mission === null) || !!this.sample(this.fatherSampleId));
  }

  private breed(): void {
    const mother = this.card(this.motherId);
    const fatherCard = this.card(this.fatherCardId);
    const fatherSample = this.sample(this.fatherSampleId);
    if (!mother || (!fatherCard && !fatherSample) || !this.canBreed()) return;

    const fatherGenes = fatherCard ? fatherCard.traitGenes : fatherSample!.traitGenes;
    const fatherHidden = fatherCard ? fatherCard.hiddenGenes : fatherSample!.hiddenGenes;
    const sex: Sex = Phaser.Math.Between(0, 1) === 0 ? '女' : '男';
    const childGenes = TRAITS.reduce((acc, key) => {
      acc[key] = this.inherit(mother.traitGenes[key], fatherGenes[key], DOM[key]);
      return acc;
    }, {} as TraitGenes);
    const childHidden = DEFECTS.reduce((acc, key) => {
      acc[key] = this.inherit(mother.hiddenGenes[key], fatherHidden[key], DOM[key]);
      return acc;
    }, {} as HiddenGenes);
    const child = this.makeCard(this.makeName(sex, childGenes, this.nextId), sex, Math.max(mother.generation, fatherCard?.generation ?? 1) + 1, mother.id, fatherCard?.id ?? null, childGenes, childHidden);

    mother.stamina = Math.max(0, mother.stamina - 2);
    mother.pregnancy = { child, fatherLabel: fatherCard?.name ?? fatherSample!.name, daysRemaining: mother.defects.includes('难孕') ? 4 : 3 };
    if (fatherCard) fatherCard.stamina = Math.max(0, fatherCard.stamina - 1);
    if (fatherSample) {
      this.samples = this.samples.filter((sample) => sample.id !== fatherSample.id);
      this.fatherSampleId = null;
    }
    if (fatherCard && fatherCard.stamina < 1) this.fatherCardId = null;
    if (mother.stamina < 2) this.motherId = null;
    this.credits -= this.breedCost();
    this.breedings += 1;
    this.nextId += 1;
    this.revealId = null;
    this.pushLog(`${mother.name} 已怀孕，预计 ${mother.pregnancy.daysRemaining} 天后分娩。父系来源：${mother.pregnancy.fatherLabel}。`);
    this.render();
  }
  private advanceDay(): void {
    this.day += 1;
    const newborns: Card[] = [];

    this.clients.forEach((client) => {
      if (!this.isClientActive(client)) return;
      const agent = this.card(client.assignedCardId);
      if (!agent || !agent.mission) {
        this.resetClient(client, true);
        return;
      }

      const loyaltyLoss = this.computeLoyaltyLoss(agent, client);
      agent.loyalty = Math.max(0, agent.loyalty - loyaltyLoss);
      const risk = this.computeFailureRisk(agent, client);
      client.failureRisk = risk;
      client.daysRemaining = Math.max(0, client.daysRemaining - 1);
      agent.mission.daysRemaining = client.daysRemaining;
      agent.mission.failureRisk = risk;

      if (agent.loyalty <= 0) {
        this.handleDefection(agent, client);
        return;
      }

      if (Phaser.Math.FloatBetween(0, 100) < risk) {
        this.failMission(agent, client, '能力不足，未能完成任务，只得撤回。');
        return;
      }

      if (client.daysRemaining <= 0) {
        this.resolveMission(agent, client);
      }
    });

    this.roster.forEach((card) => {
      if (!card.pregnancy) return;
      card.pregnancy.daysRemaining -= 1;
      if (card.pregnancy.daysRemaining <= 0) {
        const child = card.pregnancy.child;
        newborns.push(child);
        this.revealId = child.id;
        this.pushLog(`${card.name} 顺利分娩，子代 ${child.name} (${child.chromosomes}) 加入卡库。`);
        if (child.defects.length) {
          this.pushLog(`${child.name} 显现缺陷：${child.defects.join('、')}。`);
        }
        card.pregnancy = null;
      }
    });

    if (newborns.length) {
      this.roster.unshift(...newborns.reverse());
      this.rosterScroll = 0;
    }

    if (this.exposureRisk >= 100) {
      this.scene.start('GameOver', {
        credits: this.credits,
        totalBreedings: this.breedings,
        totalServices: this.services,
        sampleCount: this.samples.length,
        rosterSize: this.roster.length,
        reason: '实验室因多次叛逃而彻底暴露。'
      });
      return;
    }

    this.pushLog(`时间推进到第 ${this.day} 天。`);
    this.render();
  }

  private resolveMission(card: Card, client: Client): void {
    const mission = card.mission;
    if (!mission) return;

    const preferenceScore = mission.prefs.reduce((sum, key) => sum + this.pairScore(card.traitGenes[key]), 0);
    const objectiveScore = mission.objectiveTraits.reduce((sum, key) => sum + this.pairScore(card.traitGenes[key]), 0);
    const stabilityBonus = this.pairScore(card.traitGenes.STABLE);
    const talkBonus = this.pairScore(card.traitGenes.TALK);
    const tenderBonus = this.pairScore(card.traitGenes.TENDER);
    const defectPenalty = (card.defects.includes('冷淡') ? 2 : 0) + (card.defects.includes('体弱') ? 1 : 0);
    const successScore = preferenceScore + objectiveScore + stabilityBonus + talkBonus + tenderBonus - defectPenalty + Phaser.Math.Between(-1, 2);

    if (successScore >= mission.difficulty + 3) {
      const reward = mission.reward + 4;
      this.credits += reward;
      this.services += 1;
      this.pushLog(`${card.name} 成功完成“${mission.objective}”，从 ${mission.targetLabel} 身边全身而退，获得 ${reward} 资金。`);

      const sampleChance = Phaser.Math.Clamp(
        mission.sampleChance + (preferenceScore - mission.difficulty) * 0.05 + tenderBonus * 0.04 + talkBonus * 0.03,
        0.08,
        0.94
      );
      if (Math.random() <= sampleChance) {
        const sample = this.makeMissionSample(mission);
        this.samples.unshift(sample);
        this.samplesEarned += 1;
        this.pushLog(`${card.name} 额外带回了 ${sample.name}。`);
      }
    } else if (successScore >= mission.difficulty) {
      this.credits += mission.reward;
      this.services += 1;
      this.pushLog(`${card.name} 完成了“${mission.objective}”，从 ${mission.targetLabel} 处拿到 ${mission.reward} 资金。`);
    } else {
      this.failMission(card, client, '关键动作没有完成，任务只能中止返回。');
      return;
    }

    card.mission = null;
    card.stamina = Math.max(0, card.stamina - 1);
    this.resetClient(client, true);
  }

  private failMission(card: Card, client: Client, message: string): void {
    const loss = Math.max(1, Math.min(5, client.reward - 6));
    this.credits = Math.max(0, this.credits - loss);
    card.stamina = Math.max(0, card.stamina - 1);
    card.mission = null;
    this.resetClient(client, true);
    this.pushLog(`${card.name} 在 ${client.name} 的委托中失手，${message}`);
  }

  private handleDefection(card: Card, client: Client): void {
    this.exposureRisk = Math.min(100, this.exposureRisk + 25);
    this.roster = this.roster.filter((entry) => entry.id !== card.id);
    if (this.motherId === card.id) this.motherId = null;
    if (this.fatherCardId === card.id) this.fatherCardId = null;
    if (this.serviceId === card.id) this.serviceId = null;
    if (this.revealId === card.id) this.revealId = null;
    this.resetClient(client, true);
    this.pushLog(`${card.name} 被 ${client.name} 的魅力与拉拢瓦解后叛逃，实验室暴露风险上升。`);
  }

  private resetClient(client: Client, reroll: boolean): void {
    const index = this.clients.findIndex((entry) => entry.id === client.id);
    if (index < 0) return;
    if (reroll) {
      this.clients[index] = this.makeClient();
      if (this.detailClientId === client.id) this.detailClientId = null;
      return;
    }
    client.assignedCardId = null;
    client.daysRemaining = client.durationDays;
    client.failureRisk = 0;
  }

  private isClientActive(client: Client): boolean {
    return !!client.assignedCardId;
  }

  private computeFailureRisk(card: Card, client: Client): number {
    const prefScore = client.prefs.reduce((sum, key) => sum + this.pairScore(card.traitGenes[key]), 0);
    const objectiveScore = client.objectiveTraits.reduce((sum, key) => sum + this.pairScore(card.traitGenes[key]), 0);
    const stableScore = this.pairScore(card.traitGenes.STABLE);
    const tenderScore = this.pairScore(card.traitGenes.TENDER);
    const talkScore = this.pairScore(card.traitGenes.TALK);
    const loyaltyGuard = Math.floor(card.loyalty / 2);
    const defectPenalty = (card.defects.includes('冷淡') ? 8 : 0) + (card.defects.includes('体弱') ? 6 : 0);
    return Phaser.Math.Clamp(18 + client.difficulty * 8 + client.charisma * 3 - prefScore * 7 - objectiveScore * 6 - stableScore * 5 - tenderScore * 3 - talkScore * 3 - loyaltyGuard * 2 + defectPenalty, 6, 92);
  }

  private computeLoyaltyLoss(card: Card, client: Client): number {
    const stableScore = this.pairScore(card.traitGenes.STABLE);
    const tenderScore = this.pairScore(card.traitGenes.TENDER);
    return Math.max(1, client.charisma - stableScore - tenderScore + (card.defects.includes('冷淡') ? 1 : 0));
  }

  private makeCard(name: string, sex: Sex, generation: number, parentAId: string | null, parentBId: string | null, traitGenes: TraitGenes, hiddenGenes: HiddenGenes): Card {
    const defects = this.manifest(hiddenGenes);
    let maxStamina = sex === '女' ? 6 : 5;
    if (defects.includes('体弱')) maxStamina = Math.max(3, maxStamina - 2);
    const maxLoyalty = sex === '女' ? 8 : 0;
    return {
      id: `card-${name}-${Phaser.Math.RND.uuid().slice(0, 6)}`,
      name,
      sex,
      generation,
      chromosomes: sex === '女' ? 'XX' : 'XY',
      parentAId,
      parentBId,
      traitGenes,
      hiddenGenes,
      stamina: maxStamina,
      maxStamina,
      loyalty: maxLoyalty,
      maxLoyalty,
      defects,
      tags: this.tags(sex, traitGenes, defects),
      mission: null,
      pregnancy: null
    };
  }

  private makeSample(name: string, source: string, traitGenes: TraitGenes, hiddenGenes: HiddenGenes): Sample {
    return { id: `sample-${name}-${Phaser.Math.RND.uuid().slice(0, 5)}`, name, source, traitGenes, hiddenGenes };
  }

  private makeClient(): Client {
    const names = ['沈', '周', '林', '许', '韩', '顾', '程', '梁'];
    const titles = ['私人顾问', '年轻议员', '博物馆赞助人', '安保主管', '制药顾问', '基金经理', '剧院投资人', '研究院主任'];
    const objectives = ['拿到私人行程表', '确认保险箱口令', '复制门禁密钥', '套出即将出席的名单', '植入定位片', '拿到会客记录'];
    const hints = ['他表面温和，实则一直在观察对方是否会露怯。', '他社交经验老练，更容易被自然细腻的陪伴卸下戒心。', '他身份敏感，只会对让他感到舒适的人松口。', '他偏好自然不做作的气质，对浮夸表现非常警惕。'];
    const a = Phaser.Utils.Array.GetRandom(TRAITS);
    const b = Phaser.Utils.Array.GetRandom(TRAITS.filter((trait) => trait !== a));
    const c = Phaser.Utils.Array.GetRandom(TRAITS.filter((trait) => trait !== a && trait !== b));
    const difficulty = Phaser.Math.Between(3, 6);
    const charisma = Phaser.Math.Between(2, 5);
    const name = `${Phaser.Utils.Array.GetRandom(names)}先生`;
    const title = Phaser.Utils.Array.GetRandom(titles);
    const objective = Phaser.Utils.Array.GetRandom(objectives);
    const briefing = Phaser.Utils.Array.GetRandom(hints);

    return {
      id: `client-${Phaser.Math.RND.uuid().slice(0, 6)}`,
      name,
      title,
      objective,
      briefing,
      prefs: [a, b],
      objectiveTraits: [b, c],
      reward: Phaser.Math.Between(10, 16),
      sampleChance: 0.18 + difficulty * 0.04,
      difficulty,
      durationDays: Phaser.Math.Between(2, 4),
      charisma,
      clues: this.makeClues(name, objective, briefing, a, b, c, charisma),
      assignedCardId: null,
      daysRemaining: 0,
      failureRisk: 0
    };
  }
  private makeClues(name: string, objective: string, briefing: string, a: TraitKey, b: TraitKey, c: TraitKey, charisma: number): Clue[] {
    return [
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, title: '公开资料', text: briefing, cost: 0, unlocked: true },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, title: '私下偏好', text: `${name} 更容易把注意力给到${this.traitHint(a)}的人，过于相反的气质会引发他的戒备。`, cost: 4, unlocked: false },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, title: '任务切口', text: `若想完成“${objective}”，最好让特工在${this.traitHint(b)}和${this.traitHint(c)}上都能站得住。`, cost: 5, unlocked: false },
      { id: `clue-${Phaser.Math.RND.uuid().slice(0, 4)}`, title: '情感压迫', text: `目标自带${this.charismaLabel(charisma)}，若特工忠诚不稳，任务拖得越久越容易失控。`, cost: 6, unlocked: false }
    ];
  }

  private client(id?: string | null): Client | null {
    return id ? this.clients.find((client) => client.id === id) ?? null : null;
  }

  private manifest(hidden: HiddenGenes): string[] {
    const out: string[] = [];
    if (hidden.FRAIL[0] === 'x' && hidden.FRAIL[1] === 'x') out.push('体弱');
    if (hidden.COLD[0] === 'y' && hidden.COLD[1] === 'y') out.push('冷淡');
    if (hidden.LOW_FERTILITY[0] === 'z' && hidden.LOW_FERTILITY[1] === 'z') out.push('难孕');
    return out;
  }

  private tags(sex: Sex, genes: TraitGenes, defects: string[]): string[] {
    const ordered = [...TRAITS].sort((left, right) => this.pairScore(genes[right]) - this.pairScore(genes[left]));
    const first = ordered[0];
    const tags: string[] = [];
    if (first === 'TENDER') tags.push('安抚型');
    else if (first === 'TALK') tags.push('会聊型');
    else if (first === 'AURA') tags.push('气场型');
    else if (first === 'LOOK' || first === 'FIGURE') tags.push(sex === '女' ? '头牌潜质' : '俊秀父系');
    else tags.push('稳重型');
    if (this.pairScore(genes.STABLE) === 2) tags.push('情绪稳定');
    else if (this.pairScore(genes.TENDER) === 2) tags.push('高亲和');
    else if (this.pairScore(genes.TALK) === 2) tags.push('会引导');
    if (defects.length) tags.push('风险血系');
    return tags.slice(0, 3);
  }

  private getRisk(): Risk {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    if (!mother || (!father && !this.fatherSampleId)) return { label: '低', detail: '先选女性卡和男性卡或授权样本。', color: '#86efac' };
    if (!father) return { label: '低', detail: '授权样本默认视为外部血源。', color: '#86efac' };
    const a = [mother.parentAId, mother.parentBId].filter((id): id is string => !!id);
    const b = [father.parentAId, father.parentBId].filter((id): id is string => !!id);
    if (a.includes(father.id) || b.includes(mother.id)) return { label: '极高', detail: '亲子繁育会显著提高隐性缺陷纯合概率。', color: '#fb7185' };
    if (mother.parentAId && mother.parentBId && mother.parentAId === father.parentAId && mother.parentBId === father.parentBId) return { label: '高', detail: '同父同母的血系风险较高。', color: '#f97316' };
    if (a.some((id) => b.includes(id))) return { label: '中', detail: '双方共享一位父母。', color: '#facc15' };
    return { label: '低', detail: '当前未检测到近亲关系。', color: '#86efac' };
  }

  private breedCost(): number {
    const mother = this.card(this.motherId);
    const father = this.card(this.fatherCardId);
    return this.breedCostBase + (mother?.defects.includes('难孕') ? 4 : 0) + (father?.defects.includes('难孕') ? 2 : 0);
  }

  private charismaLabel(charisma: number): string {
    if (charisma >= 5) return '极强魅力';
    if (charisma >= 4) return '高魅力';
    if (charisma >= 3) return '中等魅力';
    return '低魅力';
  }

  private traitHint(key: TraitKey): string {
    const hints: Record<TraitKey, string> = {
      LOOK: '精致的外表',
      FIGURE: '有存在感的身姿',
      AURA: '不张扬却稳住场面的气质',
      TENDER: '温和耐心的陪伴',
      TALK: '能顺着对话往前引的表达',
      STABLE: '让人放心的稳定感'
    };
    return hints[key];
  }

  private avatar(card: Card, x: number, y: number): void {
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

  private traitBadges(genes: TraitGenes, x: number, y: number): void {
    const list = TRAITS.map((key) => this.traitLabel(key, genes[key]));
    const cols = [x, x + 88, x + 176];
    const rows = [y, y + 16];
    list.forEach((item, index) => {
      this.ui.push(this.add.text(cols[index % 3], rows[Math.floor(index / 3)], item.label, { fontSize: '10px', color: item.color, fontStyle: 'bold' }));
    });
  }

  private traitLabel(key: TraitKey, pair: GenePair): { label: string; color: string } {
    const score = this.pairScore(pair);
    if (score === 2) return { label: `${LABELS[key]}+`, color: '#60a5fa' };
    if (score === 1) return { label: LABELS[key], color: '#f8fafc' };
    return { label: `${LABELS[key]}-`, color: '#f87171' };
  }

  private pairScore(pair: GenePair): number {
    return pair.filter((allele) => allele === allele.toUpperCase()).length;
  }

  private inherit(a: GenePair, b: GenePair, dominant: string): GenePair {
    const pair = [Phaser.Utils.Array.GetRandom(a), Phaser.Utils.Array.GetRandom(b)] as GenePair;
    const sorted = [...pair].sort((left, right) => (left === dominant ? -1 : right === dominant ? 1 : left.localeCompare(right)));
    return [sorted[0], sorted[1]];
  }

  private makeName(sex: Sex, genes: TraitGenes, serial: number): string {
    const order = [...TRAITS].sort((left, right) => this.pairScore(genes[right]) - this.pairScore(genes[left]));
    const female: Record<TraitKey, string> = { LOOK: '绮', FIGURE: '纱', AURA: '澜', TENDER: '柔', TALK: '语', STABLE: '宁' };
    const male: Record<TraitKey, string> = { LOOK: '曜', FIGURE: '岳', AURA: '宸', TENDER: '温', TALK: '言', STABLE: '衡' };
    const suffix: Record<TraitKey, string> = { LOOK: '颜', FIGURE: '姿', AURA: '仪', TENDER: '心', TALK: '辞', STABLE: '序' };
    const prefix = sex === '女' ? female[order[0]] : male[order[0]];
    return `${prefix}${suffix[order[1] ?? order[0]]}${serial}号`;
  }

  private makeMissionSample(mission: ActiveMission): Sample {
    const genes = TRAITS.reduce((acc, key) => {
      const dominant = DOM[key];
      const emphasize = mission.prefs.includes(key) || mission.objectiveTraits.includes(key);
      acc[key] = emphasize
        ? (Phaser.Math.Between(0, 100) < 60 ? [dominant, dominant] : [dominant, dominant.toLowerCase()]) as GenePair
        : (Phaser.Math.Between(0, 100) < 30 ? [dominant, dominant.toLowerCase()] : [dominant.toLowerCase(), dominant.toLowerCase()]) as GenePair;
      return acc;
    }, {} as TraitGenes);

    const hidden = DEFECTS.reduce((acc, key) => {
      const dominant = DOM[key];
      acc[key] = Phaser.Math.Between(0, 100) < 78 ? [dominant, dominant] : [dominant, dominant.toLowerCase()];
      return acc;
    }, {} as HiddenGenes);

    return this.makeSample(`授权样本-${mission.targetLabel[0]}${mission.objective[0]}`, mission.targetLabel, genes, hidden);
  }

  private filteredRoster(): Card[] {
    if (this.rosterTab === 'female') return this.roster.filter((card) => card.sex === '女');
    if (this.rosterTab === 'male') return this.roster.filter((card) => card.sex === '男');
    return this.roster;
  }

  private maxScroll(): number {
    const rowHeight = 126;
    const gap = 10;
    const rows = this.rosterTab === 'sample' ? this.samples.length : this.filteredRoster().length;
    const content = rows * rowHeight + Math.max(0, rows - 1) * gap;
    return Math.max(0, content - 312);
  }

  private clampScroll(value: number): number {
    return Phaser.Math.Clamp(value, 0, this.maxScroll());
  }

  private inRoster(x: number, y: number): boolean {
    return x >= 18 && x <= 642 && y >= 104 && y <= 440;
  }

  private card(id?: string | null): Card | null {
    return id ? this.roster.find((card) => card.id === id) ?? null : null;
  }

  private sample(id?: string | null): Sample | null {
    return id ? this.samples.find((sample) => sample.id === id) ?? null : null;
  }

  private pushLog(message: string): void {
    this.log.unshift(message);
    this.log = this.log.slice(0, 8);
  }

  private cardStatus(card: Card): string {
    if (card.pregnancy) return `怀孕中(${card.pregnancy.daysRemaining}天)`;
    if (card.mission) return `潜入中(${card.mission.daysRemaining}天 风险${Math.round(card.mission.failureRisk)}%)`;
    return '空闲';
  }

  private button(x: number, y: number, w: number, h: number, label: string, enabled: boolean, onClick: () => void, fill = 0x334155): void {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, enabled ? fill : 0x374151, enabled ? 0.96 : 0.5).setStrokeStyle(1, enabled ? 0xe9d5ff : 0x6b7280);
    const text = this.add.text(x + w / 2, y + h / 2, label, { fontSize: '10px', color: enabled ? '#fff7fb' : '#9ca3af', fontStyle: 'bold' }).setOrigin(0.5);
    this.ui.push(bg, text);
    if (enabled) bg.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }
}
