'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Game() {
  const { roomCode } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [username, setUsername] = useState(''); // TODO: Get from local storage or context
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username') || '';
    setUsername(storedUsername);

    const fetchGame = async () => {
      try {
        console.log('Fetching game for room:', roomCode);
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('room_code', roomCode)
          .single();

        console.log('Supabase response:', { data, error });

        if (error) {
          console.error('Supabase error:', error);
          setError(`Database error: ${error.message}`);
          return;
        }

        if (!data) {
          setError('Game not found');
          return;
        }

        setGame(data);
        setPlayerNumber(data.player1_username === storedUsername ? 1 : 2);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load game: ${(err as Error).message}`);
      }
    };

    fetchGame();

    // Subscribe to real-time updates for this specific room
    const subscription = supabase
      .channel(`game-${roomCode}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          console.log('Real-time update received:', payload);
          setGame(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomCode]);

  const handleMove = async (column: number) => {
    if (!game || game.winner !== null || game.current_turn !== playerNumber) {
      console.log('Move blocked:', { game: !!game, winner: game?.winner, currentTurn: game?.current_turn, playerNumber });
      return;
    }

    try {
      console.log('Making move:', { column, player: playerNumber, roomCode });
      const res = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, column, player: playerNumber }),
      });
      const data = await res.json();
      console.log('Move response:', data);
      
      if (data.error) throw new Error(data.error);
      
      // Real-time subscription will handle the update automatically
      
    } catch (err) {
      console.error('Move error:', err);
      setError((err as Error).message);
    }
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!game) return <div>Loading...</div>;

  const { board, player1_username, player2_username, current_turn, winner } = game;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Connect 4</h1>
      <div className="mb-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-lg font-semibold">Room Code: {roomCode}</p>
        <p className="text-sm text-gray-600">Share this code with your friend!</p>
      </div>
      <p className="mb-2">Player 1: {player1_username} (Red)</p>
      <p className="mb-2">Player 2: {player2_username || 'Waiting...'} (Yellow)</p>
      <p className="mb-4 text-lg font-semibold">Current Turn: Player {current_turn}</p>
      {winner !== null && (
        <p className="text-2xl font-bold mb-4">
          {winner === 0 ? 'Tie!' : `Player ${winner} Wins!`}
        </p>
      )}
      <div className="grid grid-cols-7 gap-1 bg-blue-500 p-2 rounded">
        {board[0].map((_: any, col: number) => (
          <div key={col} className="flex flex-col">
            {board.map((row: number[], rowIdx: number) => (
              <div
                key={rowIdx}
                onClick={() => handleMove(col)}
                className={`w-12 h-12 rounded-full cursor-pointer ${
                  row[col] === 0 ? 'bg-white' : row[col] === 1 ? 'bg-red-500' : 'bg-yellow-500'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push('/')}
        className="mt-4 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
      >
        Back to Home
      </button>
    </div>
  );
}
