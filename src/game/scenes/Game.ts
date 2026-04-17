import Phaser from 'phaser';

type Core = Phaser.Physics.Arcade.Image;
type Drone = Phaser.Physics.Arcade.Sprite;

type GameResult = {
  score: number;
  victory: boolean;
  collected: number;
  target: number;
  timeRemaining: number;
  reason: string;
};

export class Game extends Phaser.Scene {
  private readonly arenaTop = 70;
  private readonly playerSpeed = 260;
  private readonly totalCores = 6;
  private readonly maxIntegrity = 3;

  private player!: Phaser.Physics.Arcade.Sprite;
  private cores!: Phaser.Physics.Arcade.Group;
  private drones!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private score = 0;
  private timeLeft = 45;
  private integrity = this.maxIntegrity;
  private collected = 0;
  private isEnding = false;
  private isInvulnerable = false;

  private scoreText!: Phaser.GameObjects.Text;
  private coresText!: Phaser.GameObjects.Text;
  private integrityText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private droneSpawnEvent?: Phaser.Time.TimerEvent;
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b1018');

    this.createTextures();
    this.createArena(width, height);

    this.player = this.physics.add.sprite(width / 2, height - 70, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.001);

    this.player.body!.setSize(28, 28);
    this.player.setDepth(2);

    this.cores = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image
    });
    this.drones = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite
    });

    this.physics.add.overlap(
      this.player,
      this.cores,
      this.collectCore as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.drones,
      this.hitByDrone as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys(
      'W,A,S,D'
    ) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    this.add.rectangle(width / 2, 34, width, 68, 0x111827, 0.95);

    this.scoreText = this.add.text(20, 18, 'Score: 0', {
      fontSize: '22px',
      color: '#ffffff'
    });

    this.coresText = this.add.text(170, 18, `Cores: 0/${this.totalCores}`, {
      fontSize: '22px',
      color: '#ffffff'
    });

    this.integrityText = this.add.text(340, 18, `Integrity: ${this.integrity}`, {
      fontSize: '22px',
      color: '#ffffff'
    });

    this.statusText = this.add.text(width / 2, 18, 'Status: Sweep the arena', {
      fontSize: '20px',
      color: '#8be9fd'
    });
    this.statusText.setOrigin(0.5, 0);

    this.timerText = this.add.text(width - 20, 18, `Time: ${this.timeLeft}`, {
      fontSize: '22px',
      color: '#ffffff'
    });
    this.timerText.setOrigin(1, 0);

    this.spawnCores();
    this.spawnDrone(false);
    this.spawnDrone(true);

    this.droneSpawnEvent = this.time.addEvent({
      delay: 5500,
      loop: true,
      callback: () => {
        if (this.drones.countActive(true) < 5) {
          this.spawnDrone(true);
        }
      },
      callbackScope: this
    });

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        this.timerText.setText(`Time: ${this.timeLeft}`);

        if (this.timeLeft <= 0) {
          this.finishRun(false, 'Arena lockout reached');
        }
      }
    });
  }

  update(): void {
    if (this.isEnding) {
      this.player.setVelocity(0, 0);
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -this.playerSpeed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = this.playerSpeed;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -this.playerSpeed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = this.playerSpeed;
    }

    this.player.setVelocity(vx, vy);

    if (vx !== 0 && vy !== 0) {
      this.player.body!.velocity.normalize().scale(this.playerSpeed);
    }

    this.drones.children.each((child) => {
      const drone = child as Drone;
      if (!drone.active) {
        return true;
      }

      this.physics.moveToObject(drone, this.player, 120 + this.collected * 8);
      return true;
    });
  }

  private createTextures(): void {
    if (!this.textures.exists('player')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x5ec8ff, 1);
      g.fillTriangle(16, 0, 32, 32, 16, 24);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(16, 6, 24, 24, 16, 20);
      g.generateTexture('player', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('core')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffd166, 1);
      g.fillRect(8, 0, 16, 32);
      g.fillRect(0, 8, 32, 16);
      g.fillStyle(0xfff0c2, 1);
      g.fillRect(11, 3, 10, 26);
      g.fillRect(3, 11, 26, 10);
      g.generateTexture('core', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('drone')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xff6b6b, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(3, 0x581c1c, 1);
      g.strokeCircle(16, 16, 14);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 4);
      g.generateTexture('drone', 32, 32);
      g.destroy();
    }
  }

  private createArena(width: number, height: number): void {
    this.add.rectangle(width / 2, (height + this.arenaTop) / 2, width - 32, height - this.arenaTop - 16, 0x132033)
      .setStrokeStyle(3, 0x2f4f6a);

    this.add.text(width / 2, height - 24, 'Sweep cores, avoid drones, finish before lockout.', {
      fontSize: '18px',
      color: '#94a3b8'
    }).setOrigin(0.5, 1);
  }

  private spawnCores(): void {
    const { width, height } = this.scale;
    const positions = [
      { x: 120, y: 130 },
      { x: width / 2, y: 120 },
      { x: width - 120, y: 160 },
      { x: 180, y: height / 2 + 10 },
      { x: width - 190, y: height / 2 + 30 },
      { x: width / 2, y: height - 110 }
    ];

    positions.forEach((position) => {
      const core = this.cores.get(position.x, position.y, 'core') as Core | null;

      if (!core) {
        return;
      }

      core.setActive(true);
      core.setVisible(true);
      core.setPosition(position.x, position.y);
      core.setImmovable(true);
      core.setDepth(1);

      if (core.body) {
        core.body.enable = true;
        core.body.setCircle(14, 2, 2);
      }

      this.tweens.add({
        targets: core,
        y: position.y - 10,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    });
  }

  private spawnDrone(randomizeY: boolean): void {
    const { width, height } = this.scale;
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const x = fromLeft ? 40 : width - 40;
    const y = randomizeY
      ? Phaser.Math.Between(this.arenaTop + 50, height - 60)
      : this.arenaTop + 40;
    const drone = this.drones.get(x, y, 'drone') as Drone | null;

    if (!drone) {
      return;
    }

    drone.setActive(true);
    drone.setVisible(true);
    drone.setPosition(x, y);
    drone.setDepth(1);
    drone.setCollideWorldBounds(true);
    drone.setBounce(1, 1);

    if (drone.body) {
      drone.body.enable = true;
      drone.body.setCircle(14, 2, 2);
    }
  }

  private collectCore(
    _player: Phaser.GameObjects.GameObject,
    coreObj: Phaser.GameObjects.GameObject
  ): void {
    if (this.isEnding) {
      return;
    }

    const core = coreObj as Core;
    core.disableBody(true, true);
    this.tweens.killTweensOf(core);

    this.collected += 1;
    this.score += 100;
    this.scoreText.setText(`Score: ${this.score}`);
    this.coresText.setText(`Cores: ${this.collected}/${this.totalCores}`);
    this.statusText.setText(
      this.collected === this.totalCores
        ? 'Status: Extraction window open'
        : 'Status: Core secured'
    );

    if (this.collected >= this.totalCores) {
      this.score += this.timeLeft * 10;
      this.scoreText.setText(`Score: ${this.score}`);
      this.finishRun(true, 'All cores recovered');
    }
  }

  private hitByDrone(
    _player: Phaser.GameObjects.GameObject,
    droneObj: Phaser.GameObjects.GameObject
  ): void {
    if (this.isEnding || this.isInvulnerable) {
      return;
    }

    const drone = droneObj as Drone;
    const push = new Phaser.Math.Vector2(this.player.x - drone.x, this.player.y - drone.y)
      .normalize()
      .scale(280);

    this.integrity -= 1;
    this.integrityText.setText(`Integrity: ${this.integrity}`);
    this.statusText.setText('Status: Direct hit');
    this.player.setVelocity(push.x, push.y);

    if (this.integrity <= 0) {
      this.finishRun(false, 'Hull integrity collapsed');
      return;
    }

    this.isInvulnerable = true;
    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      yoyo: true,
      repeat: 5,
      duration: 90,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      }
    });
  }

  private finishRun(victory: boolean, reason: string): void {
    if (this.isEnding) {
      return;
    }

    this.isEnding = true;

    this.droneSpawnEvent?.remove(false);
    this.timerEvent?.remove(false);
    this.statusText.setText(`Status: ${reason}`);
    this.player.setTint(victory ? 0xb8ffb0 : 0xff9b9b);

    this.drones.children.each((child) => {
      const drone = child as Drone;
      drone.setVelocity(0, 0);
      if (drone.body) {
        drone.body.enable = false;
      }
      return true;
    });

    const result: GameResult = {
      score: this.score,
      victory,
      collected: this.collected,
      target: this.totalCores,
      timeRemaining: Math.max(0, this.timeLeft),
      reason
    };

    this.time.delayedCall(650, () => {
      this.scene.start('GameOver', result);
    });
  }
}
