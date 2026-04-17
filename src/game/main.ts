import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { LabSliceScene } from './scenes/LabSlice';
import { GameOver } from './scenes/GameOver';

let game: Phaser.Game | null = null;

export function StartGame(parent: string): Phaser.Game {
  if (game) {
    return game;
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#18202b',
    parent,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot, Preloader, MainMenu, LabSliceScene, GameOver]
  };

  game = new Phaser.Game(config);

  return game;
}
