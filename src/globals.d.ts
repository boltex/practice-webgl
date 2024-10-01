import { Game } from './main';

export { };

declare global {
  interface Window {
    game: Game;
  }
}
