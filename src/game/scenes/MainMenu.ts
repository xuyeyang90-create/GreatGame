import Phaser from 'phaser';

const UI_FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

export class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#08111d');

    this.add.rectangle(width / 2, height / 2, width - 90, height - 90, 0x101927, 0.94).setStrokeStyle(2, 0x365473);
    this.add.rectangle(width / 2, 122, width - 180, 72, 0x142336, 0.95).setStrokeStyle(1, 0x4c6f94);

    this.add.text(width / 2, 122, '仿生人制造公司', { fontFamily: UI_FONT_FAMILY, fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 192, '你正在经营一家仿生人制造公司的隐秘实验室。\n公司用女性仿生人牵制赏金猎人、争取舆论窗口，\n并试图推动仿生人合法化。', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '16px',
      color: '#cfd8e3',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);
    this.add.text(width / 2, 252, '本轮重点', { fontFamily: UI_FONT_FAMILY, fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 286, '1. 女性 / 男性 / 样本卡库，显示健康、年龄、生命阶段、特质、缺陷与状态', { fontFamily: UI_FONT_FAMILY, fontSize: '14px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 316, '2. 推进一天会更新任务、怀孕、成长特质、健康磨损、寿命进度与事件日志', { fontFamily: UI_FONT_FAMILY, fontSize: '14px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 346, '3. 繁育界面显示成功率、血系风险、孕程风险与心智风险', { fontFamily: UI_FONT_FAMILY, fontSize: '14px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 376, '4. 委托是社会潜入 / 陪同 / 情报导向任务，同时会触发带选择的实验室事件', { fontFamily: UI_FONT_FAMILY, fontSize: '14px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 420, '主失败条件：实验室暴露风险达到 100。', { fontFamily: UI_FONT_FAMILY, fontSize: '15px', color: '#fda4af' }).setOrigin(0.5);
    this.add.text(width / 2, 470, '点击任意位置或按空格开始', { fontFamily: UI_FONT_FAMILY, fontSize: '20px', color: '#ffd166' }).setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Game'));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
  }
}
