import './style.css';
import { renderGame } from './game';

const app = document.getElementById('app')!;
renderGame(app, () => {});
