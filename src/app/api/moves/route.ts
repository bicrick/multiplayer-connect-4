import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for game logic
function dropPiece(board: number[][], column: number, player: number): number[][] {
  const newBoard = board.map(row => [...row]);
  for (let row = 5; row >= 0; row--) {
    if (newBoard[row][column] === 0) {
      newBoard[row][column] = player;
      return newBoard;
    }
  }
  throw new Error('Column full');
}

function checkWin(board: number[][], player: number): boolean {
  // Horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === player && board[row][col + 1] === player &&
          board[row][col + 2] === player && board[row][col + 3] === player) {
        return true;
      }
    }
  }
  // Vertical
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 3; row++) {
      if (board[row][col] === player && board[row + 1][col] === player &&
          board[row + 2][col] === player && board[row + 3][col] === player) {
        return true;
      }
    }
  }
  // Diagonal /
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === player && board[row - 1][col + 1] === player &&
          board[row - 2][col + 2] === player && board[row - 3][col + 3] === player) {
        return true;
      }
    }
  }
  // Diagonal \
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === player && board[row + 1][col + 1] === player &&
          board[row + 2][col + 2] === player && board[row + 3][col + 3] === player) {
        return true;
      }
    }
  }
  return false;
}

function checkTie(board: number[][]): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

export async function POST(request: Request) {
  const { roomCode, column, player } = await request.json(); // player: 1 or 2

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (error || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (game.current_turn !== player) return NextResponse.json({ error: 'Not your turn' }, { status: 400 });

  try {
    const newBoard = dropPiece(game.board, column, player);

    const isWin = checkWin(newBoard, player);
    const isTie = !isWin && checkTie(newBoard);

    const updateData: {
      board: number[][];
      current_turn: number;
      winner?: number;
    } = {
      board: newBoard,
      current_turn: player === 1 ? 2 : 1,
    };
    if (isWin) updateData.winner = player;
    if (isTie) updateData.winner = 0; // 0 for tie

    const { data: updated, error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('room_code', roomCode)
      .select();

    if (updateError) throw updateError;

    return NextResponse.json({ game: updated[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
