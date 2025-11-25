"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";

// ============================================================================
// Types
// ============================================================================

type Player = 1 | 2;

type GamePhase = "setup" | "playing" | "gameOver";

interface Position {
  row: number;
  col: number;
}

interface Piece {
  id: string;
  player: Player;
  position: Position;
}

interface Wall {
  id: string;
  position: Position;
  orientation: "horizontal" | "vertical";
  placedBy: Player;
  /** The piece that placed this wall (for color coding) */
  pieceId: string;
}

interface GameState {
  phase: GamePhase;
  currentPlayer: Player;
  pieces: Piece[];
  walls: Wall[];
  setupPiecesPlaced: { player1: number; player2: number };
  selectedPiece: Piece | null;
  movesThisTurn: number;
  hasMoved: boolean;
  /** Track the original position for undo */
  originalPosition: Position | null;
  /** Whether we can still deselect (first move not yet made) */
  canDeselect: boolean;
  /** Winner info */
  winner: Player | "tie" | null;
  scores: { player1: number; player2: number };
}

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 7;
const PIECES_PER_PLAYER = 4;

const PLAYER_COLORS: Record<
  Player,
  { primary: string; secondary: string; bg: string }
> = {
  1: {
    primary: "#f59e0b", // amber-500
    secondary: "#fbbf24", // amber-400
    bg: "rgba(245, 158, 11, 0.15)",
  },
  2: {
    primary: "#06b6d4", // cyan-500
    secondary: "#22d3ee", // cyan-400
    bg: "rgba(6, 182, 212, 0.15)",
  },
};

// ============================================================================
// Game Logic Utilities
// ============================================================================

function createInitialState(): GameState {
  return {
    phase: "setup",
    currentPlayer: 1,
    pieces: [],
    walls: [],
    setupPiecesPlaced: { player1: 0, player2: 0 },
    selectedPiece: null,
    movesThisTurn: 0,
    hasMoved: false,
    originalPosition: null,
    canDeselect: true,
    winner: null,
    scores: { player1: 0, player2: 0 },
  };
}

function positionsEqual(a: Position | null, b: Position | null): boolean {
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
}

function isValidPosition(pos: Position): boolean {
  return (
    pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE
  );
}

function getPieceAt(pieces: Piece[], pos: Position): Piece | undefined {
  return pieces.find((p) => positionsEqual(p.position, pos));
}

function hasWallBetween(walls: Wall[], from: Position, to: Position): boolean {
  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;

  if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return false;

  if (rowDiff !== 0) {
    // Moving vertically - check for horizontal wall
    const wallRow = rowDiff > 0 ? to.row : from.row;
    const wallCol = from.col;
    return walls.some(
      (w) =>
        w.orientation === "horizontal" &&
        w.position.row === wallRow &&
        w.position.col === wallCol
    );
  } else {
    // Moving horizontally - check for vertical wall
    const wallRow = from.row;
    const wallCol = colDiff > 0 ? to.col : from.col;
    return walls.some(
      (w) =>
        w.orientation === "vertical" &&
        w.position.row === wallRow &&
        w.position.col === wallCol
    );
  }
}

function getValidMoves(
  piece: Piece,
  pieces: Piece[],
  walls: Wall[]
): Position[] {
  const moves: Position[] = [];
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (const dir of directions) {
    const newPos = {
      row: piece.position.row + dir.row,
      col: piece.position.col + dir.col,
    };

    if (!isValidPosition(newPos)) continue;
    if (getPieceAt(pieces, newPos)) continue;
    if (hasWallBetween(walls, piece.position, newPos)) continue;

    moves.push(newPos);
  }

  return moves;
}

function getValidWallPlacements(
  piece: Piece,
  walls: Wall[]
): { position: Position; orientation: "horizontal" | "vertical" }[] {
  const placements: {
    position: Position;
    orientation: "horizontal" | "vertical";
  }[] = [];
  const pos = piece.position;

  // Check all 4 adjacent wall slots
  // Top wall (horizontal wall at current row)
  if (pos.row > 0) {
    const wallPos = { row: pos.row, col: pos.col };
    if (
      !walls.some(
        (w) =>
          w.orientation === "horizontal" && positionsEqual(w.position, wallPos)
      )
    ) {
      placements.push({ position: wallPos, orientation: "horizontal" });
    }
  }

  // Bottom wall (horizontal wall at row + 1)
  if (pos.row < GRID_SIZE - 1) {
    const wallPos = { row: pos.row + 1, col: pos.col };
    if (
      !walls.some(
        (w) =>
          w.orientation === "horizontal" && positionsEqual(w.position, wallPos)
      )
    ) {
      placements.push({ position: wallPos, orientation: "horizontal" });
    }
  }

  // Left wall (vertical wall at current col)
  if (pos.col > 0) {
    const wallPos = { row: pos.row, col: pos.col };
    if (
      !walls.some(
        (w) =>
          w.orientation === "vertical" && positionsEqual(w.position, wallPos)
      )
    ) {
      placements.push({ position: wallPos, orientation: "vertical" });
    }
  }

  // Right wall (vertical wall at col + 1)
  if (pos.col < GRID_SIZE - 1) {
    const wallPos = { row: pos.row, col: pos.col + 1 };
    if (
      !walls.some(
        (w) =>
          w.orientation === "vertical" && positionsEqual(w.position, wallPos)
      )
    ) {
      placements.push({ position: wallPos, orientation: "vertical" });
    }
  }

  return placements;
}

/**
 * Flood fill to find all cells in an enclosed area
 */
function floodFill(
  startPos: Position,
  walls: Wall[],
  visited: Set<string>
): Position[] {
  const area: Position[] = [];
  const stack: Position[] = [startPos];
  const key = (p: Position) => `${p.row},${p.col}`;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentKey = key(current);

    if (visited.has(currentKey)) continue;
    if (!isValidPosition(current)) continue;

    visited.add(currentKey);
    area.push(current);

    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];

    for (const dir of directions) {
      const next = {
        row: current.row + dir.row,
        col: current.col + dir.col,
      };

      if (!isValidPosition(next)) continue;
      if (visited.has(key(next))) continue;
      if (hasWallBetween(walls, current, next)) continue;

      stack.push(next);
    }
  }

  return area;
}

/**
 * Check if a piece is isolated (in its own unique area with no other pieces)
 */
function isPieceIsolated(
  piece: Piece,
  pieces: Piece[],
  walls: Wall[]
): boolean {
  const visited = new Set<string>();
  const area = floodFill(piece.position, walls, visited);

  // Check if any other piece is in this area
  for (const otherPiece of pieces) {
    if (otherPiece.id === piece.id) continue;
    if (area.some((pos) => positionsEqual(pos, otherPiece.position))) {
      return false;
    }
  }

  return true;
}

/**
 * Check if game is over (all pieces isolated)
 */
function checkGameOver(pieces: Piece[], walls: Wall[]): boolean {
  return pieces.every((piece) => isPieceIsolated(piece, pieces, walls));
}

/**
 * Calculate scores for each player
 */
function calculateScores(
  pieces: Piece[],
  walls: Wall[]
): { player1: number; player2: number } {
  const scores = { player1: 0, player2: 0 };
  const visitedGlobal = new Set<string>();

  for (const piece of pieces) {
    const key = (p: Position) => `${p.row},${p.col}`;
    if (visitedGlobal.has(key(piece.position))) continue;

    const visited = new Set<string>();
    const area = floodFill(piece.position, walls, visited);

    // Mark all cells as globally visited
    area.forEach((pos) => visitedGlobal.add(key(pos)));

    // Add area size to player's score
    if (piece.player === 1) {
      scores.player1 += area.length;
    } else {
      scores.player2 += area.length;
    }
  }

  return scores;
}

/**
 * Calculate which cells belong to enclosed areas (areas with only one piece)
 * Returns a map of cell key to the player who owns that enclosed area
 * Only counts as enclosed if walls are actually constraining the area
 */
function calculateEnclosedAreas(
  pieces: Piece[],
  walls: Wall[]
): Map<string, Player> {
  const enclosedCells = new Map<string, Player>();
  const key = (p: Position) => `${p.row},${p.col}`;
  const totalBoardSize = GRID_SIZE * GRID_SIZE;

  // No enclosures possible without walls
  if (walls.length === 0) return enclosedCells;

  for (const piece of pieces) {
    // Check if this piece is isolated
    if (!isPieceIsolated(piece, pieces, walls)) continue;

    // Get all cells in this piece's area
    const visited = new Set<string>();
    const area = floodFill(piece.position, walls, visited);

    // Only count as enclosed if walls are actually constraining the area
    // (area size must be less than total board size)
    if (area.length >= totalBoardSize) continue;

    // Mark all cells as belonging to this player
    for (const pos of area) {
      enclosedCells.set(key(pos), piece.player);
    }
  }

  return enclosedCells;
}

// ============================================================================
// Components
// ============================================================================

interface CellProps {
  row: number;
  col: number;
  piece: Piece | undefined;
  isValidMove: boolean;
  isSelected: boolean;
  isValidWallTop: boolean;
  isValidWallBottom: boolean;
  isValidWallLeft: boolean;
  isValidWallRight: boolean;
  walls: Wall[];
  onCellClick: () => void;
  onWallClick: (
    orientation: "horizontal" | "vertical",
    position: Position
  ) => void;
  gamePhase: GamePhase;
  currentPlayer: Player;
  selectedPiece: Piece | null;
  /** If this cell is part of an enclosed area, which player owns it */
  enclosedByPlayer: Player | null;
}

function Cell({
  row,
  col,
  piece,
  isValidMove,
  isSelected,
  isValidWallTop,
  isValidWallBottom,
  isValidWallLeft,
  isValidWallRight,
  walls,
  onCellClick,
  onWallClick,
  gamePhase,
  currentPlayer,
  selectedPiece,
  enclosedByPlayer,
}: CellProps) {
  const hasWallTop = walls.some(
    (w) =>
      w.orientation === "horizontal" &&
      w.position.row === row &&
      w.position.col === col
  );
  const hasWallBottom = walls.some(
    (w) =>
      w.orientation === "horizontal" &&
      w.position.row === row + 1 &&
      w.position.col === col
  );
  const hasWallLeft = walls.some(
    (w) =>
      w.orientation === "vertical" &&
      w.position.row === row &&
      w.position.col === col
  );
  const hasWallRight = walls.some(
    (w) =>
      w.orientation === "vertical" &&
      w.position.row === row &&
      w.position.col === col + 1
  );

  const getWallColor = (
    orientation: "horizontal" | "vertical",
    wallRow: number,
    wallCol: number
  ) => {
    const wall = walls.find(
      (w) =>
        w.orientation === orientation &&
        w.position.row === wallRow &&
        w.position.col === wallCol
    );
    if (!wall) return PLAYER_COLORS[currentPlayer].primary;
    return PLAYER_COLORS[wall.placedBy].primary;
  };

  const isClickable =
    (gamePhase === "setup" && !piece) ||
    (gamePhase === "playing" &&
      (isValidMove || (piece && piece.player === currentPlayer)));

  return (
    <div className="relative">
      {/* Main cell */}
      <motion.div
        className={`
          w-12 h-12 sm:w-14 sm:h-14
          flex items-center justify-center
          cursor-${isClickable ? "pointer" : "default"}
          transition-all duration-300
        `}
        style={{
          backgroundColor: enclosedByPlayer
            ? PLAYER_COLORS[enclosedByPlayer].bg
            : isValidMove
            ? "rgba(255, 255, 255, 0.1)"
            : "transparent",
        }}
        onClick={onCellClick}
        whileHover={isClickable ? { scale: 1.02 } : undefined}
        whileTap={isClickable ? { scale: 0.98 } : undefined}
      >
        {/* Valid move indicator */}
        {isValidMove && !piece && (
          <div
            className="w-3 h-3 rounded-full transition-opacity duration-150"
            style={{
              backgroundColor: PLAYER_COLORS[currentPlayer].primary,
              opacity: 0.6,
            }}
          />
        )}

        {/* Piece */}
        {piece && (
          <div
            className={`
              w-8 h-8 sm:w-10 sm:h-10
              rounded-full
              flex items-center justify-center
              font-mono text-xs font-bold
              transition-shadow duration-200
              ${
                piece.player === currentPlayer && gamePhase === "playing"
                  ? "cursor-pointer"
                  : ""
              }
            `}
            style={{
              backgroundColor: PLAYER_COLORS[piece.player].primary,
              border: isSelected
                ? `3px solid ${PLAYER_COLORS[piece.player].secondary}`
                : "none",
              boxShadow: isSelected
                ? `0 0 20px ${PLAYER_COLORS[piece.player].primary}`
                : "none",
            }}
          >
            <span className="text-zinc-900 opacity-80" />
          </div>
        )}
      </motion.div>

      {/* Wall slots */}
      {/* Top wall */}
      {row > 0 && (
        <div
          className={`
            absolute -top-1 left-1 right-1 h-2
            rounded-full
            transition-all duration-150
            ${
              isValidWallTop && !hasWallTop
                ? "cursor-pointer hover:opacity-100"
                : ""
            }
          `}
          style={{
            backgroundColor: hasWallTop
              ? getWallColor("horizontal", row, col)
              : isValidWallTop
              ? PLAYER_COLORS[selectedPiece?.player ?? currentPlayer].primary
              : "transparent",
            opacity: hasWallTop ? 1 : isValidWallTop ? 0.4 : 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isValidWallTop && !hasWallTop) {
              onWallClick("horizontal", { row, col });
            }
          }}
        />
      )}

      {/* Bottom wall (only render for last row) */}
      {row === GRID_SIZE - 1 && (
        <div
          className={`
            absolute -bottom-1 left-1 right-1 h-2
            rounded-full
            transition-all duration-150
            ${
              isValidWallBottom && !hasWallBottom
                ? "cursor-pointer hover:opacity-100"
                : ""
            }
          `}
          style={{
            backgroundColor: hasWallBottom
              ? getWallColor("horizontal", row + 1, col)
              : isValidWallBottom
              ? PLAYER_COLORS[selectedPiece?.player ?? currentPlayer].primary
              : "transparent",
            opacity: hasWallBottom ? 1 : isValidWallBottom ? 0.4 : 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isValidWallBottom && !hasWallBottom) {
              onWallClick("horizontal", { row: row + 1, col });
            }
          }}
        />
      )}

      {/* Left wall */}
      {col > 0 && (
        <div
          className={`
            absolute top-1 bottom-1 -left-1 w-2
            rounded-full
            transition-all duration-150
            ${
              isValidWallLeft && !hasWallLeft
                ? "cursor-pointer hover:opacity-100"
                : ""
            }
          `}
          style={{
            backgroundColor: hasWallLeft
              ? getWallColor("vertical", row, col)
              : isValidWallLeft
              ? PLAYER_COLORS[selectedPiece?.player ?? currentPlayer].primary
              : "transparent",
            opacity: hasWallLeft ? 1 : isValidWallLeft ? 0.4 : 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isValidWallLeft && !hasWallLeft) {
              onWallClick("vertical", { row, col });
            }
          }}
        />
      )}

      {/* Right wall (only render for last col) */}
      {col === GRID_SIZE - 1 && (
        <div
          className={`
            absolute top-1 bottom-1 -right-1 w-2
            rounded-full
            transition-all duration-150
            ${
              isValidWallRight && !hasWallRight
                ? "cursor-pointer hover:opacity-100"
                : ""
            }
          `}
          style={{
            backgroundColor: hasWallRight
              ? getWallColor("vertical", row, col + 1)
              : isValidWallRight
              ? PLAYER_COLORS[selectedPiece?.player ?? currentPlayer].primary
              : "transparent",
            opacity: hasWallRight ? 1 : isValidWallRight ? 0.4 : 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isValidWallRight && !hasWallRight) {
              onWallClick("vertical", { row, col: col + 1 });
            }
          }}
        />
      )}
    </div>
  );
}

function GameInfo({
  gameState,
  onRestart,
}: {
  gameState: GameState;
  onRestart: () => void;
}) {
  const {
    phase,
    currentPlayer,
    setupPiecesPlaced,
    movesThisTurn,
    winner,
    scores,
  } = gameState;

  const getPhaseText = () => {
    switch (phase) {
      case "setup":
        return "Setup Phase";
      case "playing":
        return "Game Phase";
      case "gameOver":
        return "Game Over";
    }
  };

  const getInstructionText = () => {
    switch (phase) {
      case "setup": {
        const remaining =
          currentPlayer === 1
            ? PIECES_PER_PLAYER - setupPiecesPlaced.player1
            : PIECES_PER_PLAYER - setupPiecesPlaced.player2;
        return `Place ${remaining} more piece${remaining !== 1 ? "s" : ""}`;
      }
      case "playing": {
        if (!gameState.selectedPiece) {
          return "Select a piece to move";
        }
        if (movesThisTurn === 0) {
          return "Move your piece (1-2 spaces)";
        }
        if (movesThisTurn === 1) {
          return "Move again or place a wall";
        }
        return "Place a wall";
      }
      case "gameOver": {
        if (winner === "tie") return "It's a tie!";
        return `Player ${winner} wins!`;
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex items-center gap-4">
        <motion.div
          className="px-4 py-2 rounded-lg font-mono text-sm"
          style={{
            backgroundColor: PLAYER_COLORS[currentPlayer].bg,
            borderLeft: `3px solid ${PLAYER_COLORS[currentPlayer].primary}`,
          }}
          animate={{
            borderLeftColor: PLAYER_COLORS[currentPlayer].primary,
            backgroundColor: PLAYER_COLORS[currentPlayer].bg,
          }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-zinc-400 mr-2">Turn:</span>
          <span style={{ color: PLAYER_COLORS[currentPlayer].primary }}>
            Player {currentPlayer}
          </span>
        </motion.div>

        <div className="px-4 py-2 rounded-lg bg-zinc-800/50 font-mono text-sm">
          <span className="text-zinc-400">{getPhaseText()}</span>
        </div>
      </div>

      <p className="text-zinc-400 text-sm font-mono">{getInstructionText()}</p>

      {phase === "gameOver" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-6">
            <div className="text-center">
              <span className="text-xs text-zinc-500 block">Player 1</span>
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: PLAYER_COLORS[1].primary }}
              >
                {scores.player1}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-zinc-500 block">Player 2</span>
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: PLAYER_COLORS[2].primary }}
              >
                {scores.player2}
              </span>
            </div>
          </div>
          <motion.button
            onClick={onRestart}
            className="px-6 py-2 rounded-lg bg-zinc-700 text-zinc-200 font-mono text-sm hover:bg-zinc-600 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Play Again
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Game Component
// ============================================================================

export function WallGoGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const handleRestart = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  const validMoves = useMemo(() => {
    if (gameState.phase !== "playing" || !gameState.selectedPiece) return [];
    if (gameState.movesThisTurn >= 2) return [];
    return getValidMoves(
      gameState.selectedPiece,
      gameState.pieces,
      gameState.walls
    );
  }, [
    gameState.phase,
    gameState.selectedPiece,
    gameState.pieces,
    gameState.walls,
    gameState.movesThisTurn,
  ]);

  const validWallPlacements = useMemo(() => {
    if (gameState.phase !== "playing" || !gameState.selectedPiece) return [];
    if (gameState.movesThisTurn === 0) return [];
    return getValidWallPlacements(gameState.selectedPiece, gameState.walls);
  }, [
    gameState.phase,
    gameState.selectedPiece,
    gameState.walls,
    gameState.movesThisTurn,
  ]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const pos = { row, col };

      // Setup phase: place pieces
      if (gameState.phase === "setup") {
        if (getPieceAt(gameState.pieces, pos)) return;

        const newPiece: Piece = {
          id: `piece-${gameState.currentPlayer}-${Date.now()}`,
          player: gameState.currentPlayer,
          position: pos,
        };

        const newPiecesPlaced = {
          ...gameState.setupPiecesPlaced,
          [gameState.currentPlayer === 1 ? "player1" : "player2"]:
            gameState.setupPiecesPlaced[
              gameState.currentPlayer === 1 ? "player1" : "player2"
            ] + 1,
        };

        const totalPlaced = newPiecesPlaced.player1 + newPiecesPlaced.player2;
        const setupComplete = totalPlaced === PIECES_PER_PLAYER * 2;

        // Alternate turns during setup
        const nextPlayer: Player = gameState.currentPlayer === 1 ? 2 : 1;

        setGameState((prev) => ({
          ...prev,
          pieces: [...prev.pieces, newPiece],
          setupPiecesPlaced: newPiecesPlaced,
          currentPlayer: setupComplete ? 1 : nextPlayer,
          phase: setupComplete ? "playing" : "setup",
        }));
        return;
      }

      // Playing phase
      if (gameState.phase === "playing") {
        const clickedPiece = getPieceAt(gameState.pieces, pos);

        // If clicking on a current player's piece
        if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
          // If clicking the already selected piece and we can deselect
          if (
            gameState.selectedPiece &&
            clickedPiece.id === gameState.selectedPiece.id
          ) {
            if (gameState.canDeselect) {
              // Deselect
              setGameState((prev) => ({
                ...prev,
                selectedPiece: null,
                originalPosition: null,
              }));
            }
            return;
          }

          // If we haven't moved yet, we can select a different piece
          if (!gameState.hasMoved) {
            setGameState((prev) => ({
              ...prev,
              selectedPiece: clickedPiece,
              originalPosition: clickedPiece.position,
              canDeselect: true,
            }));
          }
          return;
        }

        // If clicking on a valid move position
        if (validMoves.some((m) => positionsEqual(m, pos))) {
          const updatedPieces = gameState.pieces.map((p) =>
            p.id === gameState.selectedPiece!.id ? { ...p, position: pos } : p
          );

          const newMovesCount = gameState.movesThisTurn + 1;
          const updatedSelectedPiece = {
            ...gameState.selectedPiece!,
            position: pos,
          };

          setGameState((prev) => ({
            ...prev,
            pieces: updatedPieces,
            selectedPiece: updatedSelectedPiece,
            movesThisTurn: newMovesCount,
            hasMoved: true,
            canDeselect: false,
          }));
        }
      }
    },
    [gameState, validMoves]
  );

  const handleWallClick = useCallback(
    (orientation: "horizontal" | "vertical", position: Position) => {
      if (gameState.phase !== "playing") return;
      if (!gameState.selectedPiece) return;
      if (gameState.movesThisTurn === 0) return;

      // Check if this is a valid wall placement
      const isValid = validWallPlacements.some(
        (p) =>
          p.orientation === orientation && positionsEqual(p.position, position)
      );
      if (!isValid) return;

      const newWall: Wall = {
        id: `wall-${Date.now()}`,
        position,
        orientation,
        placedBy: gameState.currentPlayer,
        pieceId: gameState.selectedPiece.id,
      };

      const newWalls = [...gameState.walls, newWall];
      const isGameOver = checkGameOver(gameState.pieces, newWalls);
      const scores = isGameOver
        ? calculateScores(gameState.pieces, newWalls)
        : gameState.scores;
      const winner = isGameOver
        ? scores.player1 > scores.player2
          ? 1
          : scores.player2 > scores.player1
          ? 2
          : "tie"
        : null;

      const nextPlayer: Player = gameState.currentPlayer === 1 ? 2 : 1;

      setGameState((prev) => ({
        ...prev,
        walls: newWalls,
        selectedPiece: null,
        movesThisTurn: 0,
        hasMoved: false,
        originalPosition: null,
        canDeselect: true,
        currentPlayer: isGameOver ? prev.currentPlayer : nextPlayer,
        phase: isGameOver ? "gameOver" : "playing",
        winner,
        scores,
      }));
    },
    [gameState, validWallPlacements]
  );

  // Create wall placement lookup for cells
  const wallPlacementLookup = useMemo(() => {
    const lookup: Record<
      string,
      { top: boolean; bottom: boolean; left: boolean; right: boolean }
    > = {};

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${row},${col}`;
        lookup[key] = {
          top: validWallPlacements.some(
            (p) =>
              p.orientation === "horizontal" &&
              p.position.row === row &&
              p.position.col === col
          ),
          bottom: validWallPlacements.some(
            (p) =>
              p.orientation === "horizontal" &&
              p.position.row === row + 1 &&
              p.position.col === col
          ),
          left: validWallPlacements.some(
            (p) =>
              p.orientation === "vertical" &&
              p.position.row === row &&
              p.position.col === col
          ),
          right: validWallPlacements.some(
            (p) =>
              p.orientation === "vertical" &&
              p.position.row === row &&
              p.position.col === col + 1
          ),
        };
      }
    }

    return lookup;
  }, [validWallPlacements]);

  // Calculate enclosed areas for shading
  const enclosedAreasLookup = useMemo(() => {
    return calculateEnclosedAreas(gameState.pieces, gameState.walls);
  }, [gameState.pieces, gameState.walls]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-4">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10">
        {/* Title */}
        <motion.h1
          className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `linear-gradient(135deg, ${PLAYER_COLORS[1].primary}, ${PLAYER_COLORS[2].primary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Wall Go
        </motion.h1>

        <motion.p
          className="text-zinc-500 text-sm text-center mb-8 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          A tactical game of enclosure
        </motion.p>

        <GameInfo gameState={gameState} onRestart={handleRestart} />

        {/* Game Board */}
        <motion.div
          className="relative p-4 rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(39, 39, 42, 0.8), rgba(24, 24, 27, 0.9))",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(63, 63, 70, 0.5)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Grid lines */}
          <div
            className="grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              border: "2px solid rgba(82, 82, 91, 0.8)",
              borderRadius: "4px",
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const row = Math.floor(index / GRID_SIZE);
              const col = index % GRID_SIZE;
              const piece = getPieceAt(gameState.pieces, { row, col });
              const isValidMove = validMoves.some(
                (m) => m.row === row && m.col === col
              );
              const isSelected =
                gameState.selectedPiece &&
                positionsEqual(gameState.selectedPiece.position, { row, col });
              const cellKey = `${row},${col}`;
              const wallLookup = wallPlacementLookup[cellKey] || {
                top: false,
                bottom: false,
                left: false,
                right: false,
              };

              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    borderRight:
                      col < GRID_SIZE - 1
                        ? "1px solid rgba(63, 63, 70, 0.5)"
                        : "none",
                    borderBottom:
                      row < GRID_SIZE - 1
                        ? "1px solid rgba(63, 63, 70, 0.5)"
                        : "none",
                  }}
                >
                  <Cell
                    row={row}
                    col={col}
                    piece={piece}
                    isValidMove={isValidMove}
                    isSelected={!!isSelected}
                    isValidWallTop={wallLookup.top}
                    isValidWallBottom={wallLookup.bottom}
                    isValidWallLeft={wallLookup.left}
                    isValidWallRight={wallLookup.right}
                    walls={gameState.walls}
                    onCellClick={() => handleCellClick(row, col)}
                    onWallClick={handleWallClick}
                    gamePhase={gameState.phase}
                    currentPlayer={gameState.currentPlayer}
                    selectedPiece={gameState.selectedPiece}
                    enclosedByPlayer={enclosedAreasLookup.get(cellKey) ?? null}
                  />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Legend and Reset */}
        <motion.div
          className="mt-6 flex items-center justify-between text-xs font-mono text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Spacer for balance */}
          <div className="w-8" />

          {/* Player legend */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[1].primary }}
              />
              <span>Player 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[2].primary }}
              />
              <span>Player 2</span>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleRestart}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Reset game"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
