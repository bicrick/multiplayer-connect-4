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
  const [username, setUsername] = useState('');
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [error, setError] = useState('');
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');

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
      
      // Check if user is already in the game
      if (data.player1_username === storedUsername) {
        setPlayerNumber(1);
      } else if (data.player2_username === storedUsername) {
        setPlayerNumber(2);
      } else {
        // User is not in the game - check if they can join
        if (!data.player2_username && storedUsername) {
          // Room has space and user has a stored username - auto join
          handleAutoJoin(storedUsername);
        } else if (!data.player2_username) {
          // Room has space but no stored username - show join prompt
          setShowJoinPrompt(true);
        } else {
          // Room is full
          setError('This game room is full');
        }
      }
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

  const handleAutoJoin = async (username: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', username, roomCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Update local state
      setGame(data.game);
      setPlayerNumber(2);
      setShowJoinPrompt(false);
    } catch (err) {
      console.error('Auto join error:', err);
      setError((err as Error).message);
    }
  };

  const handleManualJoin = async () => {
    if (!joinUsername.trim()) {
      setError('Please enter a username');
      return;
    }
    
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', username: joinUsername, roomCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Store username and update state
      localStorage.setItem('username', joinUsername);
      setUsername(joinUsername);
      setGame(data.game);
      setPlayerNumber(2);
      setShowJoinPrompt(false);
    } catch (err) {
      console.error('Join error:', err);
      setError((err as Error).message);
    }
  };

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

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="text-red-500 text-xl mb-4">{error}</div>
      <button
        onClick={() => router.push('/')}
        className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
      >
        Back to Home
      </button>
    </div>
  );
  
  if (!game) return <div>Loading...</div>;

  // Show join prompt if user needs to join
  if (showJoinPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <h1 className="text-3xl font-bold mb-4">Join Connect 4 Game</h1>
        <div className="mb-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-lg font-semibold">Room Code: {roomCode}</p>
          <p className="text-sm text-gray-600">Player 1: {game.player1_username} is waiting for you!</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          <input
            type="text"
            placeholder="Enter your username"
            value={joinUsername}
            onChange={(e) => setJoinUsername(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleManualJoin()}
          />
          <button
            onClick={handleManualJoin}
            className="w-full bg-green-500 text-white p-2 rounded mb-4 hover:bg-green-600"
          >
            Join Game
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
