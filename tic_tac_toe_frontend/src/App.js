import React, { useState, useEffect } from 'react';
import './App.css';

// Square component for each cell
function Square({ value, onClick, disabled }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      disabled={disabled || value != null}
      aria-label={value ? `Cell of ${value}` : "Empty cell"}
    >
      {value}
    </button>
  );
}

// Board component showing 3x3 grid
function Board({ board, onCellClick, disabled }) {
  return (
    <div className="ttt-board">
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <Square
            key={`${rowIdx}-${colIdx}`}
            value={cell}
            disabled={disabled}
            onClick={() => onCellClick(rowIdx, colIdx)}
          />
        ))
      )}
    </div>
  );
}

// Modal/notification for game status
function GameStatusModal({ winner, draw, showing, onClose }) {
  if (!showing) return null;
  const message = winner
    ? `Player ${winner} wins!`
    : draw
      ? "It's a draw!"
      : null;
  return (
    <div className="ttt-modal-backdrop" data-testid="game-status-modal">
      <div className="ttt-modal">
        <div className="ttt-modal-msg">{message}</div>
        <button className="ttt-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// Settings panel to choose X/O, mode, start/reset game
function GameSettings({ onStart, playerMark, setPlayerMark, mode, setMode, running, onReset }) {
  return (
    <div className="ttt-settings">
      <div className="ttt-row">
        <label>
          <span className="ttt-label">You play as:</span>
          <select
            value={playerMark}
            onChange={e => setPlayerMark(e.target.value)}
            disabled={running}
            data-testid="choose-mark"
          >
            <option value="X">X</option>
            <option value="O">O</option>
          </select>
        </label>
        <label>
          <span className="ttt-label">Mode:</span>
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            disabled={running}
            data-testid="choose-mode"
          >
            <option value="ai">Single Player (AI)</option>
            <option value="local">Local Multiplayer</option>
          </select>
        </label>
      </div>
      <div className="ttt-row">
        {!running ? (
          <button className="ttt-btn ttt-btn-main" onClick={onStart} data-testid="start-game">
            Start New Game
          </button>
        ) : (
          <button className="ttt-btn" onClick={onReset} data-testid="reset-game">
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

const emptyBoard = () => [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

// PUBLIC_INTERFACE
function App() {
  // State
  const [theme, setTheme] = useState('light');
  const [board, setBoard] = useState(emptyBoard());
  const [current, setCurrent] = useState('X'); // 'X' or 'O'
  const [playerMark, setPlayerMark] = useState('X');
  const [mode, setMode] = useState('ai'); // 'ai' or 'local'
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState(null); // 'X', 'O', or null
  const [draw, setDraw] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Effect: Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Compute winner
  function calcWinner(board) {
    // Rows, cols, diags
    const lines = [
      // Rows
      ...board,
      // Cols
      [board[0][0], board[1][0], board[2][0]],
      [board[0][1], board[1][1], board[2][1]],
      [board[0][2], board[1][2], board[2][2]],
      // Diags
      [board[0][0], board[1][1], board[2][2]],
      [board[0][2], board[1][1], board[2][0]],
    ];
    for (const line of lines) {
      if (line[0] && line[0] === line[1] && line[0] === line[2]) return line[0];
    }
    return null;
  }

  function isBoardFull(board) {
    return board.flat().every(cell => cell != null);
  }

  // PUBLIC_INTERFACE
  function startGame() {
    setBoard(emptyBoard());
    setCurrent('X');
    setWinner(null);
    setDraw(false);
    setRunning(true);
    setShowModal(false);
  }

  // PUBLIC_INTERFACE
  function resetGame() {
    setBoard(emptyBoard());
    setCurrent('X');
    setWinner(null);
    setDraw(false);
    setShowModal(false);
  }

  // Host: On player move
  function onCellClick(rowIdx, colIdx) {
    if (!running || winner || board[rowIdx][colIdx]) return;
    if (mode === 'ai' && current !== playerMark) return; // AI's turn, player shouldn't move

    const newBoard = board.map(row => [...row]);
    newBoard[rowIdx][colIdx] = current;

    setBoard(newBoard);

    const _winner = calcWinner(newBoard);
    if (_winner) {
      setWinner(_winner);
      setShowModal(true);
      setRunning(false);
      return;
    }
    if (isBoardFull(newBoard)) {
      setDraw(true);
      setShowModal(true);
      setRunning(false);
      return;
    }
    setCurrent(current === 'X' ? 'O' : 'X');
  }

  // AI: Make a move, simple minimax for Tic Tac Toe. Prefer center, then win/block, else random.
  function aiMove() {
    if (!running || winner) return;

    const emptyCells = [];
    board.forEach((row, i) =>
      row.forEach((cell, j) => {
        if (!cell) emptyCells.push([i, j]);
      })
    );

    // Minimax for Tic Tac Toe is feasible (depth 9).
    function bestMove(boardState, aiMark, humanMark) {
      // check win
      const win = calcWinner(boardState);
      if (win === aiMark) return { score: 1 };
      if (win === humanMark) return { score: -1 };
      if (isBoardFull(boardState)) return { score: 0 };

      // Minimax: maximize for aiMark, minimize for humanMark
      const possibleMoves = [];
      for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 3; ++j) {
          if (!boardState[i][j]) {
            const newBoard = boardState.map(r => [...r]);
            newBoard[i][j] = aiMark;
            // Human's turn next
            const result = minimax(newBoard, false, aiMark, humanMark);
            possibleMoves.push({ score: result.score, move: [i, j] });
          }
        }
      }
      // Pick max score
      let max = -Infinity, best = null;
      for (let move of possibleMoves) {
        if (move.score > max) {
          max = move.score;
          best = move.move;
        }
      }
      return { move: best, score: max };
    }

    function minimax(boardState, isAITurn, aiMark, humanMark) {
      const win = calcWinner(boardState);
      if (win === aiMark) return { score: 1 };
      if (win === humanMark) return { score: -1 };
      if (isBoardFull(boardState)) return { score: 0 };
      let bestScore = isAITurn ? -Infinity : Infinity;
      for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 3; ++j) {
          if (!boardState[i][j]) {
            const newBoard = boardState.map(r => [...r]);
            newBoard[i][j] = isAITurn ? aiMark : humanMark;
            const score = minimax(newBoard, !isAITurn, aiMark, humanMark).score;
            if (isAITurn) {
              bestScore = Math.max(score, bestScore);
            } else {
              bestScore = Math.min(score, bestScore);
            }
          }
        }
      }
      return { score: bestScore };
    }

    // AI's mark, player's mark
    const aiMark = playerMark === 'X' ? 'O' : 'X';
    const humanMark = playerMark;
    const moveResult = bestMove(board, aiMark, humanMark);

    if (moveResult.move) {
      onCellClick(moveResult.move[0], moveResult.move[1]);
    } // else not possible (should not occur)
  }

  // Trigger AI if needed after player move (ai mode, and current is AI)
  useEffect(() => {
    if (
      running &&
      mode === 'ai' &&
      !winner &&
      !draw &&
      current !== playerMark
    ) {
      // Add slight delay for realism
      const t = setTimeout(() => aiMove(), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [board, running, winner, draw, current, mode, playerMark]);

  // Reset game if mode or mark selection changes before game start
  useEffect(() => {
    if (!running) {
      setBoard(emptyBoard());
      setCurrent('X');
      setWinner(null);
      setDraw(false);
      setShowModal(false);
    }
    // eslint-disable-next-line
  }, [playerMark, mode]);

  // Render

  return (
    <div className="App">
      <header className="App-header" style={{ justifyContent: 'flex-start', minHeight: 'unset', paddingTop: 48 }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 className="ttt-title">Tic Tac Toe</h1>
        <div className="ttt-desc">Play against AI or a friend.</div>
        <GameSettings
          onStart={startGame}
          playerMark={playerMark}
          setPlayerMark={setPlayerMark}
          mode={mode}
          setMode={setMode}
          running={running}
          onReset={resetGame}
        />
        <Board
          board={board}
          onCellClick={onCellClick}
          disabled={!running || winner || draw}
        />
        <div className="ttt-info">
          {running ? (
            mode === "ai" ? (
              <span>
                {current === playerMark ? "Your turn" : "AI is thinking..."}
              </span>
            ) : (
              <span>
                Player <b>{current}</b>'s turn
              </span>
            )
          ) : (
            <span>Start a new game ↑</span>
          )}
        </div>
        <GameStatusModal
          winner={winner}
          draw={draw}
          showing={showModal}
          onClose={() => setShowModal(false)}
        />
        <footer className="ttt-footer">
          <span>
            <a href="https://reactjs.org" className="App-link" rel="noopener noreferrer" target="_blank">
              React
            </a>
            {" · "}
            Minimal design by Kavia
          </span>
        </footer>
      </header>
    </div>
  );
}

export default App;
