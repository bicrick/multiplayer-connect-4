import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  const { action, username, roomCode, nextStarter } = await request.json();

  if (action === 'create') {
    const roomCodeGenerated = uuidv4().slice(0, 6).toUpperCase(); // Short unique code
    const initialBoard = Array(6).fill(null).map(() => Array(7).fill(0)); // 0: empty, 1: player1, 2: player2
    const { data, error } = await supabase
      .from('games')
      .insert([{
        room_code: roomCodeGenerated,
        player1_username: username,
        board: initialBoard,
        current_turn: 1
      }])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ roomCode: roomCodeGenerated, game: data[0] });
  }

  if (action === 'join') {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    if (data.player2_username) return NextResponse.json({ error: 'Room full' }, { status: 400 });

    const { data: updated, error: updateError } = await supabase
      .from('games')
      .update({ player2_username: username })
      .eq('room_code', roomCode)
      .select();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ game: updated[0] });
  }

  if (action === 'reset') {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // Reset the game board and use the provided starting player
    const initialBoard = Array(6).fill(null).map(() => Array(7).fill(0));
    // Use the nextStarter provided by the client, defaulting to player 1 if not specified
    const newStartingPlayer = nextStarter || 1;
    
    const { data: updated, error: updateError } = await supabase
      .from('games')
      .update({ 
        board: initialBoard,
        current_turn: newStartingPlayer,
        winner: null
      })
      .eq('room_code', roomCode)
      .select();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ game: updated[0] });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
