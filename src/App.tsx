import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Sun, Moon, Volume2, VolumeX, Check, Undo2, Eraser, Edit3 } from 'lucide-react';
import {
  Difficulty,
  GameMode,
  GameState,
  Grid,
  createGame,
  getLocalDateString,
  isBoardCompleted,
  getRemainingCounts,
  loadSavedTheme,
  saveTheme,
  loadActiveGame,
  saveActiveGame,
  isDailyCompletedToday,
  markDailyCompleted,
  sounds,
} from './sudoku';

interface BoardProps {
  grid: Grid;
  selectedCell: [number, number] | null;
  onSelectCell: (r: number, c: number) => void;
  size?: number;
  boxRows?: number;
  boxCols?: number;
  isSpecialDiagonal?: boolean;
}

const Board: React.FC<BoardProps> = ({
  grid,
  selectedCell,
  onSelectCell,
  size = 9,
  boxRows = 3,
  boxCols = 3,
  isSpecialDiagonal = false,
}) => {
  const selectedValue =
    selectedCell && grid[selectedCell[0]] && grid[selectedCell[0]][selectedCell[1]]
      ? grid[selectedCell[0]][selectedCell[1]].value
      : null;

  const is12 = size === 12;

  return (
    <div className="relative w-full max-w-[480px] aspect-square mx-auto p-1.5 sm:p-2 bg-stone-300 dark:bg-stone-700 rounded-2xl shadow-sm transition-colors">
      <div
        className={`w-full h-full grid rounded-xl overflow-hidden border-2 border-stone-850 dark:border-stone-200 bg-stone-200 dark:bg-stone-800 ${
          is12 ? 'grid-cols-12 grid-rows-12' : 'grid-cols-9 grid-rows-9'
        }`}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const isSameRow = selectedCell?.[0] === r;
            const isSameCol = selectedCell?.[1] === c;
            const isSameBox =
              selectedCell &&
              Math.floor(selectedCell[0] / boxRows) === Math.floor(r / boxRows) &&
              Math.floor(selectedCell[1] / boxCols) === Math.floor(c / boxCols);
            const isRelated = isSameRow || isSameCol || isSameBox;
            const isSameNumber =
              selectedValue !== null && selectedValue > 0 && cell.value === selectedValue;

            const borderRight =
              (c + 1) % boxCols === 0 && c !== size - 1
                ? 'border-r-2 border-r-stone-850 dark:border-r-stone-200'
                : 'border-r border-r-stone-300 dark:border-stone-700';

            const borderBottom =
              (r + 1) % boxRows === 0 && r !== size - 1
                ? 'border-b-2 border-b-stone-850 dark:border-b-stone-200'
                : 'border-b border-b-stone-300 dark:border-stone-700';

            let bgClass = 'bg-stone-100 dark:bg-stone-900';
            if (isSelected) {
              bgClass = 'bg-stone-300 dark:bg-stone-700 ring-2 ring-stone-900 dark:ring-stone-100 ring-inset';
            } else if (isSameNumber) {
              bgClass = 'bg-stone-250 dark:bg-stone-750';
            } else if (isRelated) {
              bgClass = 'bg-stone-200/80 dark:bg-stone-800/80';
            } else if (isSpecialDiagonal && cell.isDiagonal) {
              bgClass = 'bg-stone-200/50 dark:bg-stone-850/50';
            }

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onSelectCell(r, c)}
                className={`relative flex items-center justify-center p-0 select-none outline-none transition-colors ${borderRight} ${borderBottom} ${bgClass}`}
                aria-label={`Cell ${r + 1}, ${c + 1}`}
              >
                {cell.value > 0 ? (
                  <span
                    className={`font-tabular leading-none select-none inline-flex items-center justify-center text-center ${
                      is12 ? 'text-xs sm:text-base' : 'text-xl sm:text-2xl'
                    } ${
                      cell.isInitial
                        ? 'font-bold text-stone-950 dark:text-stone-50'
                        : 'font-medium text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {cell.value}
                  </span>
                ) : (
                  !is12 && (
                    <div className="w-full h-full p-0.5 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span
                          key={n}
                          className={`flex items-center justify-center text-[8px] sm:text-[9px] font-mono leading-none ${
                            cell.notes.includes(n)
                              ? selectedValue === n
                                ? 'text-stone-950 dark:text-stone-50 font-bold'
                                : 'text-stone-500 dark:text-stone-400'
                              : 'opacity-0'
                          }`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  )
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

interface ControlsProps {
  onInputNumber: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isPencilMode: boolean;
  onTogglePencil: () => void;
  remainingCounts: Record<number, number>;
  size?: number;
}

const Controls: React.FC<ControlsProps> = ({
  onInputNumber,
  onErase,
  onUndo,
  canUndo,
  isPencilMode,
  onTogglePencil,
  remainingCounts,
  size = 9,
}) => {
  const is12 = size === 12;
  const numbers = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col gap-2.5 select-none">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center py-2.5 sm:py-3 rounded-xl border transition-all ${
            canUndo
              ? 'border-stone-400 dark:border-stone-600 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 active:scale-95 shadow-xs'
              : 'border-stone-300/40 dark:border-stone-800/40 bg-stone-100/50 dark:bg-stone-900/40 text-stone-400 dark:text-stone-600 cursor-not-allowed'
          }`}
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4 stroke-[2.2]" />
        </button>

        <button
          type="button"
          onClick={onErase}
          className="flex items-center justify-center py-2.5 sm:py-3 rounded-xl border border-stone-400 dark:border-stone-600 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 active:scale-95 transition-all shadow-xs"
          aria-label="Erase"
        >
          <Eraser className="w-4 h-4 stroke-[2.2]" />
        </button>

        <button
          type="button"
          onClick={onTogglePencil}
          className={`flex items-center justify-center py-2.5 sm:py-3 rounded-xl border transition-all shadow-xs ${
            isPencilMode
              ? 'border-stone-950 dark:border-stone-100 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
              : 'border-stone-400 dark:border-stone-600 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 active:scale-95'
          }`}
          aria-label="Notes"
        >
          <Edit3 className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>

      {is12 ? (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {numbers.slice(0, 6).map((num) => {
              const remaining = remainingCounts[num] ?? 0;
              const isDone = remaining <= 0;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => onInputNumber(num)}
                  disabled={isDone}
                  className={`flex items-center justify-center h-11 sm:h-12 rounded-xl font-tabular text-lg sm:text-xl font-bold transition-all ${
                    isDone
                      ? 'opacity-20 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-800 cursor-default'
                      : 'bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-950 dark:text-stone-50 active:scale-95 shadow-xs'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {numbers.slice(6, 12).map((num) => {
              const remaining = remainingCounts[num] ?? 0;
              const isDone = remaining <= 0;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => onInputNumber(num)}
                  disabled={isDone}
                  className={`flex items-center justify-center h-11 sm:h-12 rounded-xl font-tabular text-lg sm:text-xl font-bold transition-all ${
                    isDone
                      ? 'opacity-20 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-800 cursor-default'
                      : 'bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-950 dark:text-stone-50 active:scale-95 shadow-xs'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
          {numbers.map((num) => {
            const remaining = remainingCounts[num] ?? 0;
            const isDone = remaining <= 0;

            return (
              <button
                key={num}
                type="button"
                onClick={() => onInputNumber(num)}
                disabled={isDone}
                className={`flex items-center justify-center h-12 sm:h-14 rounded-xl font-tabular text-xl sm:text-2xl font-bold transition-all ${
                  isDone
                    ? 'opacity-20 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-800 cursor-default'
                    : 'bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-950 dark:text-stone-50 active:scale-95 shadow-xs'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'play'>(() => {
    const saved = loadActiveGame();
    return saved && !saved.isCompleted ? 'play' : 'menu';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadSavedTheme());
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [game, setGame] = useState<GameState>(() => {
    const saved = loadActiveGame();
    if (saved && !saved.isCompleted) return saved;
    return createGame('daily');
  });

  const [selectedCell, setSelectedCell] = useState<[number, number] | null>([0, 0]);
  const [isPencilMode, setIsPencilMode] = useState<boolean>(false);
  const [classicDifficulty, setClassicDifficulty] = useState<Difficulty>('medium');
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [showSpecialSelect, setShowSpecialSelect] = useState(false);
  const [dailyDone, setDailyDone] = useState(() => isDailyCompletedToday());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (screen === 'play' && !game.isCompleted) {
      saveActiveGame(game);
    } else if (game.isCompleted) {
      saveActiveGame(null);
    }
  }, [game, screen]);

  const startMode = (mode: GameMode, diff: Difficulty = 'medium') => {
    const newG = createGame(mode, diff);
    setGame(newG);
    setSelectedCell([0, 0]);
    setIsPencilMode(false);
    setShowDifficultySelect(false);
    setShowSpecialSelect(false);
    setScreen('play');
  };

  const handleRestart = () => {
    if (game.mode === 'daily') {
      startMode('daily');
    } else if (game.mode === 'special_12') {
      startMode('special_12');
    } else if (game.mode === 'special_diagonal') {
      startMode('special_diagonal');
    } else {
      startMode('classic', game.difficulty || 'medium');
    }
  };

  const handleSelectCell = (r: number, c: number) => {
    setSelectedCell([r, c]);
  };

  const handleInputNumber = useCallback(
    (num: number) => {
      if (!selectedCell || game.isCompleted) return;
      const [r, c] = selectedCell;
      const cell = game.grid[r][c];

      if (cell.isInitial) return;

      if (isPencilMode) {
        const curNotes = [...cell.notes];
        const idx = curNotes.indexOf(num);
        const newNotes = idx >= 0 ? curNotes.filter((n) => n !== num) : [...curNotes, num].sort();

        sounds.playPencil();

        setGame((prev) => {
          const nextGrid = prev.grid.map((row) => row.map((cl) => ({ ...cl })));
          nextGrid[r][c].notes = newNotes;
          const nextHistory = [
            ...prev.history,
            {
              row: r,
              col: c,
              prevValue: cell.value,
              newValue: cell.value,
              prevNotes: cell.notes,
              newNotes,
            },
          ];
          return { ...prev, grid: nextGrid, history: nextHistory };
        });
        return;
      }

      if (cell.value === num) {
        sounds.playErase();
        setGame((prev) => {
          const nextGrid = prev.grid.map((row) => row.map((cl) => ({ ...cl })));
          nextGrid[r][c].value = 0;
          const nextHistory = [
            ...prev.history,
            {
              row: r,
              col: c,
              prevValue: cell.value,
              newValue: 0,
              prevNotes: cell.notes,
              newNotes: cell.notes,
            },
          ];
          return { ...prev, grid: nextGrid, history: nextHistory };
        });
        return;
      }

      const isCorrect = num === cell.solution;
      if (isCorrect) {
        sounds.playPlaceNumber(num);
      } else {
        sounds.playError();
      }

      setGame((prev) => {
        const nextGrid = prev.grid.map((row) => row.map((cl) => ({ ...cl })));
        nextGrid[r][c].value = num;
        nextGrid[r][c].notes = [];

        if (isCorrect) {
          const size = prev.size;
          const boxRows = prev.boxRows;
          const boxCols = prev.boxCols;
          const boxR = Math.floor(r / boxRows) * boxRows;
          const boxC = Math.floor(c / boxCols) * boxCols;

          for (let i = 0; i < size; i++) {
            nextGrid[r][i].notes = nextGrid[r][i].notes.filter((n) => n !== num);
            nextGrid[i][c].notes = nextGrid[i][c].notes.filter((n) => n !== num);
          }
          for (let i = 0; i < boxRows; i++) {
            for (let j = 0; j < boxCols; j++) {
              nextGrid[boxR + i][boxC + j].notes = nextGrid[boxR + i][boxC + j].notes.filter(
                (n) => n !== num
              );
            }
          }
          if (prev.mode === 'special_diagonal') {
            if (r === c) {
              for (let i = 0; i < 9; i++) {
                nextGrid[i][i].notes = nextGrid[i][i].notes.filter((n) => n !== num);
              }
            }
            if (r + c === 8) {
              for (let i = 0; i < 9; i++) {
                nextGrid[i][8 - i].notes = nextGrid[i][8 - i].notes.filter((n) => n !== num);
              }
            }
          }
        }

        const nextHistory = [
          ...prev.history,
          {
            row: r,
            col: c,
            prevValue: cell.value,
            newValue: num,
            prevNotes: cell.notes,
            newNotes: [],
          },
        ];

        const completed = isBoardCompleted(nextGrid);
        if (completed) {
          sounds.playVictory();
          if (prev.mode === 'daily') {
            markDailyCompleted(getLocalDateString());
            setDailyDone(true);
          }
        }

        return {
          ...prev,
          grid: nextGrid,
          history: nextHistory,
          isCompleted: completed,
        };
      });
    },
    [selectedCell, game, isPencilMode]
  );

  const handleErase = useCallback(() => {
    if (!selectedCell || game.isCompleted) return;
    const [r, c] = selectedCell;
    const cell = game.grid[r][c];
    if (cell.isInitial) return;
    if (cell.value === 0 && cell.notes.length === 0) return;

    sounds.playErase();
    setGame((prev) => {
      const nextGrid = prev.grid.map((row) => row.map((cl) => ({ ...cl })));
      nextGrid[r][c].value = 0;
      nextGrid[r][c].notes = [];
      const nextHistory = [
        ...prev.history,
        {
          row: r,
          col: c,
          prevValue: cell.value,
          newValue: 0,
          prevNotes: cell.notes,
          newNotes: [],
        },
      ];
      return { ...prev, grid: nextGrid, history: nextHistory };
    });
  }, [selectedCell, game]);

  const handleUndo = useCallback(() => {
    if (game.history.length === 0 || game.isCompleted) return;
    setGame((prev) => {
      const nextHistory = [...prev.history];
      const last = nextHistory.pop();
      if (!last) return prev;

      const nextGrid = prev.grid.map((row) => row.map((cl) => ({ ...cl })));
      nextGrid[last.row][last.col].value = last.prevValue;
      nextGrid[last.row][last.col].notes = last.prevNotes;

      setSelectedCell([last.row, last.col]);
      sounds.playErase();
      return { ...prev, grid: nextGrid, history: nextHistory };
    });
  }, [game]);

  useEffect(() => {
    if (screen !== 'play') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      const numVal = parseInt(e.key, 10);
      if (numVal >= 1 && numVal <= 9) {
        e.preventDefault();
        handleInputNumber(numVal);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsPencilMode((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleUndo();
        return;
      }

      const maxSize = game.size;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSelectedCell((prev) => {
          if (!prev) return [0, 0];
          let [r, c] = prev;
          if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
          if (e.key === 'ArrowDown') r = Math.min(maxSize - 1, r + 1);
          if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
          if (e.key === 'ArrowRight') c = Math.min(maxSize - 1, c + 1);
          return [r, c];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, game.size, handleInputNumber, handleErase, handleUndo]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const remainingCounts = getRemainingCounts(game.grid, game.size);

  if (screen === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
        <div className="w-full max-w-sm flex justify-between items-center pt-2">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            aria-label="Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 stroke-[2.2]" /> : <VolumeX className="w-5 h-5 stroke-[2.2]" />}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 stroke-[2.2]" /> : <Moon className="w-5 h-5 stroke-[2.2]" />}
          </button>
        </div>

        <div className="w-full max-w-xs flex flex-col items-center text-center my-auto">
          <div className="flex items-center justify-center mb-10">
            <div className="flex rounded-lg overflow-hidden border border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-900 shadow-2xs">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-r border-stone-400 dark:border-stone-600">
                <span className="font-kanji font-black text-4xl sm:text-5xl text-stone-950 dark:text-stone-50 select-none leading-none inline-flex items-center justify-center text-center">
                  数
                </span>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                <span className="font-kanji font-black text-4xl sm:text-5xl text-stone-950 dark:text-stone-50 select-none leading-none inline-flex items-center justify-center text-center">
                  独
                </span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => startMode('daily')}
              className="w-full py-3.5 px-6 rounded-xl border border-stone-400 dark:border-stone-700 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-950 dark:text-stone-50 text-base font-semibold transition-all active:scale-98 flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Daily</span>
              {dailyDone && <Check className="w-4 h-4 text-stone-600 dark:text-stone-300 stroke-[2.5]" />}
            </button>

            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowDifficultySelect((prev) => !prev);
                  setShowSpecialSelect(false);
                }}
                className="w-full py-3.5 px-6 rounded-xl border border-stone-400 dark:border-stone-700 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-950 dark:text-stone-50 text-base font-semibold transition-all active:scale-98 shadow-xs"
              >
                Sudoku
              </button>

              {showDifficultySelect && (
                <div className="grid grid-cols-3 gap-1.5 pt-1 animate-in fade-in duration-150">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setClassicDifficulty(d);
                        startMode('classic', d);
                      }}
                      className="py-2.5 rounded-lg text-xs font-semibold capitalize border border-stone-400 dark:border-stone-600 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 transition-colors shadow-2xs"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSpecialSelect((prev) => !prev);
                  setShowDifficultySelect(false);
                }}
                className="w-full py-3.5 px-6 rounded-xl border border-stone-400 dark:border-stone-700 bg-stone-200/90 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-950 dark:text-stone-50 text-base font-semibold transition-all active:scale-98 shadow-xs"
              >
                Special Sudoku
              </button>

              {showSpecialSelect && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in duration-150">
                  <button
                    onClick={() => startMode('special_12')}
                    className="py-2.5 px-2 rounded-lg text-xs font-semibold border border-stone-400 dark:border-stone-600 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 transition-colors shadow-2xs"
                  >
                    12×12 Maxi
                  </button>
                  <button
                    onClick={() => startMode('special_diagonal')}
                    className="py-2.5 px-2 rounded-lg text-xs font-semibold border border-stone-400 dark:border-stone-600 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 transition-colors shadow-2xs"
                  >
                    Diagonal X
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-3 sm:p-5 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <div className="w-full max-w-[480px] flex items-center justify-between py-1">
        <button
          onClick={() => setScreen('menu')}
          className="p-2 text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-50 transition-colors"
          aria-label="Menu"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <div className="flex rounded-md overflow-hidden border border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-900 shadow-2xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-r border-stone-400 dark:border-stone-600">
            <span className="font-kanji font-black text-xs sm:text-sm text-stone-950 dark:text-stone-50 select-none leading-none inline-flex items-center justify-center text-center">
              数
            </span>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
            <span className="font-kanji font-black text-xs sm:text-sm text-stone-950 dark:text-stone-50 select-none leading-none inline-flex items-center justify-center text-center">
              独
            </span>
          </div>
        </div>

        {game.mode !== 'daily' ? (
          <button
            onClick={handleRestart}
            className="p-2 text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-50 transition-colors"
            aria-label="Restart"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.2]" />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>

      <div className="w-full my-auto py-2">
        <Board
          grid={game.grid}
          selectedCell={selectedCell}
          onSelectCell={handleSelectCell}
          size={game.size}
          boxRows={game.boxRows}
          boxCols={game.boxCols}
          isSpecialDiagonal={game.mode === 'special_diagonal'}
        />
      </div>

      {game.isCompleted ? (
        <div className="w-full max-w-[480px] flex flex-col items-center gap-3 py-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl border border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-900 shadow-2xs">
            <span className="font-kanji font-black text-3xl sm:text-4xl text-stone-950 dark:text-stone-50 select-none">
              完
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setScreen('menu')}
              className="px-5 py-2.5 rounded-xl border border-stone-400 dark:border-stone-600 bg-stone-200/90 dark:bg-stone-800 text-sm font-semibold text-stone-950 dark:text-stone-50 active:scale-95 transition-all shadow-xs"
            >
              Menu
            </button>
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 text-sm font-semibold active:scale-95 transition-all shadow-xs"
            >
              New
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full pb-2">
          <Controls
            onInputNumber={handleInputNumber}
            onErase={handleErase}
            onUndo={handleUndo}
            canUndo={game.history.length > 0}
            isPencilMode={isPencilMode}
            onTogglePencil={() => setIsPencilMode((prev) => !prev)}
            remainingCounts={remainingCounts}
            size={game.size}
          />
        </div>
      )}
    </div>
  );
}
