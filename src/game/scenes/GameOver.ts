import Phaser from 'phaser';

type GameOverData = {
  credits?: number;
  sampleCount?: number;
  totalBreedings?: number;
  totalServices?: number;
  rosterSize?: number;
  reason?: string;
};

export class GameOver extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data?: GameOverData): void {
    const { width, height } = this.scale;
    const credits = data?.credits ?? 0;
    const sampleCount = data?.sampleCount ?? 0;
    const totalBreedings = data?.totalBreedings ?? 0;
    const totalServices = data?.totalServices ?? 0;
    const rosterSize = data?.rosterSize ?? 0;
    const reason = data?.reason ?? '本轮实验室运营已经结束。';

    this.cameras.main.setBackgroundColor('#120b14');
    this.add.rectangle(width / 2, height / 2, width - 140, height - 110, 0x251221, 0.95).setStrokeStyle(2, 0xff7b72);
    this.add.text(width / 2, 126, '项目终止', { fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 194, reason, { fontSize: '18px', color: '#ffb4b4', wordWrap: { width: 700 }, align: 'center' }).setOrigin(0.5);
    this.add.text(width / 2, 260, `剩余资金 ${credits} | 样本库存 ${sampleCount}`, { fontSize: '20px', color: '#ffd166' }).setOrigin(0.5);
    this.add.text(width / 2, 300, `完成出生结算 ${totalBreedings}`, { fontSize: '18px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 334, `完成委托 ${totalServices}`, { fontSize: '18px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 368, `剩余卡牌 ${rosterSize}`, { fontSize: '18px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 434, '按 R 重新开始', { fontSize: '19px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, 468, '按 M 返回标题界面', { fontSize: '17px', color: '#cfd8e3' }).setOrigin(0.5);
    this.add.text(width / 2, 502, '点击任意位置也可重新开始', { fontSize: '15px', color: '#cbd5e1' }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-R', () => this.scene.start('Game'));
    this.input.keyboard?.once('keydown-M', () => this.scene.start('MainMenu'));
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
