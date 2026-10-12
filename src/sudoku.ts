export type GameMode = 'daily' | 'classic' | 'special_12' | 'special_diagonal';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Cell {
  row: number;
  col: number;
  value: number;
  solution: number;
  isInitial: boolean;
  notes: number[];
  isDiagonal?: boolean;
}

export type Grid = Cell[][];

export interface Move {
  row: number;
  col: number;
  prevValue: number;
  newValue: number;
  prevNotes: number[];
  newNotes: number[];
}

export interface GameState {
  id: string;
  mode: GameMode;
  size: number;
  boxRows: number;
  boxCols: number;
  difficulty?: Difficulty;
  dateString?: string;
  grid: Grid;
  history: Move[];
  isCompleted: boolean;
}

export function createPrng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  let s = h >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isValid9(board: number[][], r: number, c: number, num: number, isDiagonal = false): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === num && i !== c) return false;
    if (board[i][c] === num && i !== r) return false;
  }

  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cr = boxR + i;
      const cc = boxC + j;
      if (board[cr][cc] === num && (cr !== r || cc !== c)) return false;
    }
  }

  if (isDiagonal) {
    if (r === c) {
      for (let i = 0; i < 9; i++) {
        if (board[i][i] === num && i !== r) return false;
      }
    }
    if (r + c === 8) {
      for (let i = 0; i < 9; i++) {
        if (board[i][8 - i] === num && i !== r) return false;
      }
    }
  }

  return true;
}

function solve9(board: number[][], rng: () => number, isDiagonal = false): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
        for (const num of nums) {
          if (isValid9(board, r, c, num, isDiagonal)) {
            board[r][c] = num;
            if (solve9(board, rng, isDiagonal)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions9(board: number[][], isDiagonal = false, count = { value: 0 }): number {
  let emptyR = -1;
  let emptyC = -1;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        emptyR = r;
        emptyC = c;
        break;
      }
    }
    if (emptyR !== -1) break;
  }

  if (emptyR === -1) {
    count.value++;
    return count.value;
  }

  for (let num = 1; num <= 9; num++) {
    if (isValid9(board, emptyR, emptyC, num, isDiagonal)) {
      board[emptyR][emptyC] = num;
      countSolutions9(board, isDiagonal, count);
      board[emptyR][emptyC] = 0;
      if (count.value >= 2) return count.value;
    }
  }
  return count.value;
}

function generateSudoku9(
  difficulty: Difficulty = 'medium',
  isDiagonal = false,
  seed?: string
): { initialGrid: number[][]; solutionGrid: number[][] } {
  const rngSeed = seed || `${Date.now()}-${Math.random()}`;
  const rng = createPrng(rngSeed);

  const solution: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve9(solution, rng, isDiagonal);

  const puzzle: number[][] = solution.map((row) => [...row]);
  const cluesTarget = difficulty === 'easy' ? 38 : difficulty === 'medium' ? 31 : 25;
  const cellsToRemove = 81 - cluesTarget;

  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions, rng);

  let removed = 0;
  for (const [r, c] of shuffledPositions) {
    if (removed >= cellsToRemove) break;

    const temp = puzzle[r][c];
    puzzle[r][c] = 0;

    const copy = puzzle.map((row) => [...row]);
    const solCount = countSolutions9(copy, isDiagonal);

    if (solCount === 1) {
      removed++;
    } else {
      puzzle[r][c] = temp;
    }
  }

  return { initialGrid: puzzle, solutionGrid: solution };
}

function generateSudoku12(seed?: string): { initialGrid: number[][]; solutionGrid: number[][] } {
  const rngSeed = seed || `${Date.now()}-${Math.random()}`;
  const rng = createPrng(rngSeed);

  const base: number[][] = Array.from({ length: 12 }, (_, r) =>
    Array.from({ length: 12 }, (_, c) => {
      const band = Math.floor(r / 3);
      const rowInBand = r % 3;
      return ((band + rowInBand * 4 + c) % 12) + 1;
    })
  );

  const symbols = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rng);
  const solution: number[][] = base.map((row) =>
    row.map((val) => symbols[val - 1])
  );

  for (let b = 0; b < 4; b++) {
    const rowIndices = shuffle([0, 1, 2], rng);
    const bandRows = [solution[b * 3], solution[b * 3 + 1], solution[b * 3 + 2]];
    solution[b * 3] = bandRows[rowIndices[0]];
    solution[b * 3 + 1] = bandRows[rowIndices[1]];
    solution[b * 3 + 2] = bandRows[rowIndices[2]];
  }

  for (let s = 0; s < 3; s++) {
    const colIndices = shuffle([0, 1, 2, 3], rng);
    const oldCols: number[][] = [];
    for (let c = 0; c < 4; c++) {
      oldCols.push(solution.map((row) => row[s * 4 + c]));
    }
    for (let c = 0; c < 4; c++) {
      const newCol = oldCols[colIndices[c]];
      for (let r = 0; r < 12; r++) {
        solution[r][s * 4 + c] = newCol[r];
      }
    }
  }

  const puzzle: number[][] = solution.map((row) => [...row]);
  const cluesTarget = 68;
  const cellsToRemove = 144 - cluesTarget;

  const positions: [number, number][] = [];
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions, rng);

  for (let i = 0; i < Math.min(cellsToRemove, shuffledPositions.length); i++) {
    const [r, c] = shuffledPositions[i];
    puzzle[r][c] = 0;
  }

  return { initialGrid: puzzle, solutionGrid: solution };
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createGame(
  mode: GameMode,
  difficulty: Difficulty = 'medium',
  dateString?: string
): GameState {
  const isDaily = mode === 'daily';
  const date = dateString || getLocalDateString();
  const seed = isDaily ? `daily-sudoku-${date}` : undefined;

  if (mode === 'special_12') {
    const { initialGrid, solutionGrid } = generateSudoku12();
    const grid: Grid = Array.from({ length: 12 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => {
        const val = initialGrid[r][c];
        return {
          row: r,
          col: c,
          value: val,
          solution: solutionGrid[r][c],
          isInitial: val !== 0,
          notes: [],
        };
      })
    );
    return {
      id: `special-12-${Date.now()}`,
      mode,
      size: 12,
      boxRows: 3,
      boxCols: 4,
      grid,
      history: [],
      isCompleted: false,
    };
  }

  const isDiagonal = mode === 'special_diagonal';
  const targetDiff = isDaily ? 'medium' : difficulty;
  const { initialGrid, solutionGrid } = generateSudoku9(targetDiff, isDiagonal, seed);

  const grid: Grid = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const val = initialGrid[r][c];
      const isDiag = isDiagonal && (r === c || r + c === 8);
      return {
        row: r,
        col: c,
        value: val,
        solution: solutionGrid[r][c],
        isInitial: val !== 0,
        notes: [],
        isDiagonal: isDiag,
      };
    })
  );

  return {
    id: isDaily ? `daily-${date}` : `${mode}-${Date.now()}`,
    mode,
    size: 9,
    boxRows: 3,
    boxCols: 3,
    difficulty: mode === 'classic' ? difficulty : undefined,
    dateString: isDaily ? date : undefined,
    grid,
    history: [],
    isCompleted: false,
  };
}

export function isBoardCompleted(grid: Grid): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].value === 0 || grid[r][c].value !== grid[r][c].solution) {
        return false;
      }
    }
  }
  return true;
}

export function getRemainingCounts(grid: Grid, size = 9): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= size; i++) {
    counts[i] = size;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c].value;
      if (v >= 1 && v <= size && counts[v] !== undefined) {
        counts[v]--;
      }
    }
  }
  return counts;
}

const STORAGE_ACTIVE = 'sudoku_active_game';
const STORAGE_DAILY = 'sudoku_daily_completed';
const STORAGE_THEME = 'sudoku_theme';

export function loadSavedTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem(STORAGE_THEME);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    return 'light';
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark') {
  try {
    localStorage.setItem(STORAGE_THEME, theme);
  } catch {
    return;
  }
}

export function loadActiveGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

export function saveActiveGame(game: GameState | null) {
  try {
    if (!game) {
      localStorage.removeItem(STORAGE_ACTIVE);
    } else {
      localStorage.setItem(STORAGE_ACTIVE, JSON.stringify(game));
    }
  } catch {
    return;
  }
}

export function isDailyCompletedToday(): boolean {
  try {
    const today = getLocalDateString();
    const raw = localStorage.getItem(STORAGE_DAILY);
    if (raw) {
      const records = JSON.parse(raw);
      return !!records[today];
    }
  } catch {
    return false;
  }
  return false;
}

export function markDailyCompleted(dateString: string) {
  try {
    const raw = localStorage.getItem(STORAGE_DAILY);
    const records = raw ? JSON.parse(raw) : {};
    records[dateString] = true;
    localStorage.setItem(STORAGE_DAILY, JSON.stringify(records));
  } catch {
    return;
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playPlaceNumber(num = 5) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const baseFreq = 340 + num * 45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch {
      return;
    }
  }

  public playPencil() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      return;
    }
  }

  public playErase() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      return;
    }
  }

  public playError() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      return;
    }
  }

  public playVictory() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const chord = [523.25, 659.25, 783.99, 987.77, 1046.5];
      chord.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);

        const startTime = this.ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    } catch {
      return;
    }
  }
}

export const sounds = new SoundEngine();
