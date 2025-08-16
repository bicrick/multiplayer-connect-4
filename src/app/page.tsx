'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', username: username.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('username', username.trim());
      router.push(`/game/${data.roomCode}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!username.trim() || !roomCode.trim()) {
      setError('Please enter username and room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', username: username.trim(), roomCode: roomCode.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('username', username.trim());
      router.push(`/game/${roomCode}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Simple Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2 tracking-wide font-mono">
            CONNECT 4
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wider">
            Multiplayer
          </p>
        </div>

        {/* Simple Panel */}
        <div className="bg-gray-900 border border-gray-700 rounded p-4 sm:p-6">
          {/* Username Input */}
          <div className="mb-4">
            <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">
              Player Name
            </label>
            <input
              type="text"
              placeholder="Enter name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 sm:p-3 bg-black border border-gray-600 rounded text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
              disabled={loading}
            />
          </div>

          {/* Create Game Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-2 sm:py-3 px-4 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 mb-4 text-sm sm:text-base"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Game'
            )}
          </button>

          {/* Simple Divider */}
          <div className="flex items-center mb-4">
            <div className="flex-1 border-t border-gray-700"></div>
            <span className="px-3 text-gray-500 text-xs uppercase">or</span>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>

          {/* Join Game Section */}
          <div className="mb-4">
            <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="flex-1 p-2 sm:p-3 bg-black border border-gray-600 rounded text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors font-mono text-sm sm:text-base"
                disabled={loading}
                maxLength={6}
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="bg-gray-700 text-white font-bold px-3 sm:px-4 py-2 sm:py-3 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Join
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
