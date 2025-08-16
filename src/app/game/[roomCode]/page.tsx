'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// Extend Window interface for WebKit audio context
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import LoadingScreen from '@/components/LoadingScreen';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface GameState {
  board: number[][];
  player1_username: string;
  player2_username: string | null;
  current_turn: 1 | 2;
  winner: number | null;
  room_code: string;
}

export default function Game() {
  const { roomCode } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [error, setError] = useState('');
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');
  const [lastMove, setLastMove] = useState<{row: number, col: number, timestamp: number} | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const soundFunctionsRef = useRef<{
    playPlaceSound: () => void;
    playWinSound: () => void;
    playLoseSound: () => void;
  } | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (typeof window !== 'undefined' && !audioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      }
    };
    initAudio();
  }, [audioContext]);

  // Sound effect functions
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, [audioContext]);

  const playPlaceSound = useCallback(() => {
    // Pleasant "plop" sound
    playSound(400, 0.15, 'sine', 0.15);
    setTimeout(() => playSound(300, 0.1, 'sine', 0.1), 50);
  }, [playSound]);

  const playBlockedSound = useCallback(() => {
    // Buzzer sound
    playSound(150, 0.3, 'square', 0.08);
  }, [playSound]);

  const playWinSound = useCallback(() => {
    // Victory fanfare
    const notes = [523, 659, 784, 1047]; // C, E, G, C (major chord)
    notes.forEach((note, i) => {
      setTimeout(() => playSound(note, 0.4, 'triangle', 0.12), i * 100);
    });
  }, [playSound]);

  const playLoseSound = useCallback(() => {
    // Descending sad sound
    const notes = [400, 350, 300, 250];
    notes.forEach((note, i) => {
      setTimeout(() => playSound(note, 0.3, 'triangle', 0.08), i * 150);
    });
  }, [playSound]);

  // Update refs whenever sound functions change
  useEffect(() => {
    soundFunctionsRef.current = {
      playPlaceSound,
      playWinSound,
      playLoseSound
    };
  }, [playPlaceSound, playWinSound, playLoseSound]);

  const playResetSound = useCallback(() => {
    // Fresh start sound - ascending notes
    const notes = [300, 400, 500];
    notes.forEach((note, i) => {
      setTimeout(() => playSound(note, 0.2, 'triangle', 0.1), i * 80);
    });
  }, [playSound]);

  const handleResetGame = async () => {
    try {
      playResetSound();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', roomCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setLastMove(null); // Clear any highlighting
      // The real-time subscription will handle the update
    } catch (err) {
      console.error('Reset error:', err);
      setError((err as Error).message);
    }
  };

  const handleAutoJoin = useCallback(async (username: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', username, roomCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Update local state
      setGame(data.game as GameState);
      setPlayerNumber(2);
      localStorage.setItem('playerNumber', '2');
      setShowJoinPrompt(false);
    } catch (err) {
      console.error('Auto join error:', err);
      setError((err as Error).message);
    }
  }, [roomCode]);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username') || '';

    const fetchGame = async () => {
      try {
        console.log('Initial fetch for room:', roomCode);
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

        setGame(data as GameState);
      
        // Check if user is already in the game
        if (data.player1_username === storedUsername) {
          setPlayerNumber(1);
          localStorage.setItem('playerNumber', '1');
        } else if (data.player2_username === storedUsername) {
          setPlayerNumber(2);
          localStorage.setItem('playerNumber', '2');
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
          const newGame = payload.new as GameState;
          
          // Use a ref to get current game state to avoid stale closure
          setGame((currentGame) => {
            // Detect if this is a new move by comparing board states
            if (currentGame && newGame.board) {
              for (let row = 0; row < newGame.board.length; row++) {
                for (let col = 0; col < newGame.board[row].length; col++) {
                  if (currentGame.board[row][col] !== newGame.board[row][col] && newGame.board[row][col] !== 0) {
                    // Found the new piece - highlight it briefly
                    setLastMove({ row, col, timestamp: Date.now() });
                    setTimeout(() => setLastMove(null), 1500);
                    
                    // If it wasn't our move, play the place sound
                    const currentPlayerNumber = localStorage.getItem('playerNumber');
                    if (currentPlayerNumber && parseInt(currentPlayerNumber) !== newGame.board[row][col]) {
                      soundFunctionsRef.current?.playPlaceSound();
                    }
                    break;
                  }
                }
              }
            }
            
            // Check for game end and play win/lose sounds
            if (newGame.winner !== null && currentGame?.winner === null) {
              if (newGame.winner === 0) {
                // Tie - no sound for now
              } else {
                // Play win/lose sound based on stored player number
                setTimeout(() => {
                  const currentPlayerNumber = localStorage.getItem('playerNumber');
                  if (currentPlayerNumber && parseInt(currentPlayerNumber) === newGame.winner) {
                    soundFunctionsRef.current?.playWinSound();
                  } else {
                    soundFunctionsRef.current?.playLoseSound();
                  }
                }, 300);
              }
            }
            
            return newGame;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomCode, handleAutoJoin]); // Only depend on stable values

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
      setGame(data.game as GameState);
      setPlayerNumber(2);
      localStorage.setItem('playerNumber', '2');
      setShowJoinPrompt(false);
    } catch (err) {
      console.error('Join error:', err);
      setError((err as Error).message);
    }
  };

  const playClickSound = useCallback(() => {
    // Subtle click sound
    playSound(800, 0.05, 'sine', 0.05);
  }, [playSound]);

  const copyGameUrl = async () => {
    try {
      const gameUrl = window.location.href;
      await navigator.clipboard.writeText(gameUrl);
      setCopySuccess(true);
      playClickSound(); // Play click sound for feedback
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleMove = async (column: number) => {
    // Silent validation - don't show errors for expected user behavior
    if (!game || game.winner !== null) {
      console.log('Game is over - ignoring click');
      return;
    }
    
    if (game.current_turn !== playerNumber || playerNumber === null) {
      console.log('Not your turn - ignoring click');
      playBlockedSound(); // Just play sound feedback, no error
      return;
    }

    // Check if column is full before making server call
    const topRow = game.board[0];
    if (topRow[column] !== 0) {
      console.log('Column is full - ignoring click');
      playBlockedSound();
      return;
    }

    playClickSound(); // Immediate feedback for valid move

    try {
      console.log('Making move:', { column, player: playerNumber, roomCode });
      const res = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, column, player: playerNumber }),
      });
      const data = await res.json();
      console.log('Move response:', data);
      
      if (data.error) {
        // Handle expected errors gracefully without setting error state
        if (data.error.includes('Not your turn') || data.error.includes('Column full')) {
          console.log('Server validation:', data.error);
          playBlockedSound();
          return; // Don't show error UI for these expected cases
        }
        
        // Only set error state for unexpected server errors
        console.error('Unexpected server error:', data.error);
        playBlockedSound();
        setError(data.error);
        return;
      }
      
      playPlaceSound(); // Play placement sound
      
      // Real-time subscription will handle the update automatically
      
    } catch (err) {
      console.error('Network/request error:', err);
      // Only show error UI for network issues, not game logic issues
      setError('Connection error. Please try again.');
    }
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <div className="bg-gray-900 border border-gray-700 rounded p-6 text-center">
        <div className="text-red-400 text-xl mb-4">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
  
  if (!game) return <LoadingScreen message="Loading game..." />;

  // Show join prompt if user needs to join
  if (showJoinPrompt) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-2 tracking-wide font-mono">
              CONNECT 4
            </h1>
            <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-lg font-semibold">Room: {roomCode}</p>
                  <p className="text-gray-400 text-sm">{game.player1_username} is waiting for you!</p>
                </div>
                <button
                  onClick={copyGameUrl}
                  className={`px-3 py-2 rounded-md font-mono text-xs transition-all duration-200 ${
                    copySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Join Card */}
          <div className="bg-gray-900 border border-gray-700 rounded p-6">
            <div className="mb-4">
              <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">
                Player Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                className="w-full p-3 bg-black border border-gray-600 rounded text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleManualJoin()}
                autoFocus
              />
            </div>

            <button
              onClick={handleManualJoin}
              className="w-full bg-white text-black font-bold py-3 px-4 rounded hover:bg-gray-200 transition-colors mb-4"
            >
              Join Game
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-700 text-white font-bold px-4 py-3 rounded hover:bg-gray-600 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { board, player1_username, player2_username, current_turn, winner } = game;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-white mb-2 font-mono tracking-wider">
          CONNECT 4
        </h1>
        <div className="bg-gray-900 border border-gray-700 rounded px-4 py-3 inline-block">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-mono text-sm">Room: {roomCode}</p>
              <p className="text-gray-400 text-xs">Share this link with your friend!</p>
            </div>
            <button
              onClick={copyGameUrl}
              className={`px-3 py-2 rounded-md font-mono text-xs transition-all duration-200 ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Game Status & Turn Indicator */}
      <div className="w-full max-w-2xl mb-6">
        {winner !== null ? (
          <div className="text-center">
            <div className="bg-white text-black font-bold text-2xl py-4 rounded border-2 border-gray-300 mb-4">
              {winner === 0 ? 'TIE GAME!' : `${winner === 1 ? player1_username : player2_username} WINS!`}
            </div>
            <button
              onClick={handleResetGame}
              className="bg-gray-700 hover:bg-gray-600 text-white font-mono font-bold py-3 px-6 rounded transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-gray-900 border border-gray-700 rounded p-4">
            {/* Player 1 */}
            <div className={`flex items-center space-x-3 p-3 rounded transition-all duration-300 ${
              current_turn === 1 
                ? 'bg-gray-800 border border-gray-600' 
                : 'bg-gray-900 opacity-60'
            }`}>
              <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-red-400"></div>
              <div>
                <p className="text-white font-bold text-lg">{player1_username}</p>
                <p className="text-gray-400 text-sm font-mono">RED</p>
                {current_turn !== 1 && playerNumber === 1 && (
                  <p className="text-gray-500 text-xs italic">Wait your turn</p>
                )}
              </div>
              {current_turn === 1 && (
                <div className="ml-2 text-white animate-pulse">
                  <span className="text-2xl">▶</span>
                </div>
              )}
            </div>

            {/* VS */}
            <div className="text-gray-400 font-mono text-xl font-bold">VS</div>

            {/* Player 2 */}
            <div className={`flex items-center space-x-3 p-3 rounded transition-all duration-300 ${
              current_turn === 2 
                ? 'bg-gray-800 border border-gray-600' 
                : 'bg-gray-900 opacity-60'
            }`}>
              {current_turn === 2 && (
                <div className="mr-2 text-white animate-pulse">
                  <span className="text-2xl">◀</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-white font-bold text-lg">{player2_username || 'Waiting...'}</p>
                <p className="text-gray-400 text-sm font-mono">YELLOW</p>
                {current_turn !== 2 && playerNumber === 2 && (
                  <p className="text-gray-500 text-xs italic">Wait your turn</p>
                )}
              </div>
              <div className="w-8 h-8 bg-yellow-500 rounded-full border-2 border-yellow-400"></div>
            </div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="bg-blue-600 p-3 rounded-xl border-4 border-blue-400 shadow-2xl mb-6 relative overflow-hidden">
        {/* Noise/static overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='m0 40l40-40h-40v40'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px',
            animation: 'noise 0.5s infinite'
          }}></div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 relative z-10">
          {board[0].map((_: number, col: number) => (
            <div key={col} className="flex flex-col gap-2 relative">
              {board.map((row: number[], rowIdx: number) => {
                const piece = row[col];
                const isLastMove = lastMove && lastMove.row === rowIdx && lastMove.col === col;
                const isMyTurn = game.winner === null && game.current_turn === playerNumber;
                const isNotMyTurn = game.winner === null && game.current_turn !== playerNumber && playerNumber !== null;
                
                // Determine hover styles based on game state
                let hoverStyles = '';
                let cursorStyle = 'cursor-pointer';
                
                if (piece === 0) { // Empty slot
                  if (isMyTurn) {
                    hoverStyles = 'hover:shadow-xl hover:bg-gradient-to-br hover:from-white hover:to-gray-100 hover:scale-105';
                    cursorStyle = 'cursor-pointer';
                  } else if (isNotMyTurn) {
                    hoverStyles = 'hover:bg-red-100 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/30';
                    cursorStyle = 'cursor-not-allowed';
                  } else {
                    cursorStyle = 'cursor-default';
                  }
                } else {
                  cursorStyle = 'cursor-default';
                }
                
                return (
                  <div
                    key={rowIdx}
                    onClick={() => handleMove(col)}
                    className={`w-14 h-14 rounded-full border-2 transition-all duration-300 relative ${
                      piece === 0 
                        ? `bg-white border-gray-300 ${hoverStyles}` 
                        : piece === 1 
                          ? `bg-red-500 border-red-400 shadow-lg shadow-red-500/50 ${isLastMove ? 'ring-4 ring-red-300 ring-opacity-75 scale-110' : ''}` 
                          : `bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/50 ${isLastMove ? 'ring-4 ring-yellow-300 ring-opacity-75 scale-110' : ''}`
                    } ${cursorStyle}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes noise {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(1px, 1px);
          }
          50% {
            transform: translate(-1px, 1px);
          }
          75% {
            transform: translate(1px, -1px);
          }
        }
      `}</style>

      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="bg-gray-700 hover:bg-gray-600 text-white font-mono font-bold py-3 px-6 rounded border border-gray-600 transition-colors"
      >
        ← BACK TO HOME
      </button>
    </div>
  );
}
