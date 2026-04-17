import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Loading...', {
        fontSize: '28px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.time.delayedCall(300, () => {
      this.scene.start('MainMenu');
    });
  }
}
