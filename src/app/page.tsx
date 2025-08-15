'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCreate = async () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', username }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('username', username);
      router.push(`/game/${data.roomCode}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleJoin = async () => {
    if (!username || !roomCode) {
      setError('Please enter username and room code');
      return;
    }
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', username, roomCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('username', username);
      router.push(`/game/${roomCode}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-8">Multiplayer Connect 4</h1>
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          onClick={handleCreate}
          className="w-full bg-blue-500 text-white p-2 rounded mb-4 hover:bg-blue-600"
        >
          Create New Game
        </button>
        <div className="flex items-center mb-4">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="flex-1 p-2 border rounded mr-2"
          />
          <button
            onClick={handleJoin}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Join
          </button>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}
