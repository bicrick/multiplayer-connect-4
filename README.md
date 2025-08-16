# 🎮 Multiplayer Connect 4

A real-time multiplayer Connect 4 game built with Next.js, Supabase, and modern web technologies. Play against friends instantly with room codes, complete with sound effects, smooth animations, and an arcade-style interface.

![Connect 4 Game Screenshot](https://img.shields.io/badge/Status-Live-brightgreen)

## ✨ Features

### 🎯 **Core Gameplay**
- **Real-time Multiplayer**: Play against friends instantly using room codes
- **Automatic Game Logic**: Win detection for horizontal, vertical, and diagonal connections
- **Smart Turn Management**: Clear visual indicators for whose turn it is
- **Game Reset**: Start new rounds without creating new rooms

### 🎨 **User Experience**
- **Arcade-Style UI**: Retro aesthetic with neon colors and modern design
- **Sound Effects**: Audio feedback for moves, wins, losses, and blocked actions
- **Visual Feedback**: Hover effects, last move highlighting, and turn indicators
- **Responsive Design**: Works on desktop and mobile devices

### 🔧 **Technical Features**
- **Real-time Sync**: Instant updates using Supabase real-time subscriptions
- **Persistent Sessions**: Username storage and automatic room rejoining
- **Error Handling**: Graceful handling of network issues and invalid moves
- **TypeScript**: Full type safety throughout the application

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multiplayer-connect-4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database** (see Database Setup section below)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser** to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup (Supabase)

This application uses a single table in Supabase to manage all game state and real-time synchronization.

### Table Structure

Create a table called `games` with the following structure:

```sql
CREATE TABLE games (
  id BIGSERIAL PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  player1_username TEXT NOT NULL,
  player2_username TEXT,
  board JSONB NOT NULL DEFAULT '[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]',
  current_turn INTEGER NOT NULL DEFAULT 1 CHECK (current_turn IN (1, 2)),
  winner INTEGER DEFAULT NULL CHECK (winner IN (0, 1, 2)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key, auto-incrementing |
| `room_code` | TEXT | Unique 6-character room identifier (e.g., "ABC123") |
| `player1_username` | TEXT | Username of the player who created the room |
| `player2_username` | TEXT | Username of the second player (NULL until someone joins) |
| `board` | JSONB | 6x7 array representing the game board (0=empty, 1=player1, 2=player2) |
| `current_turn` | INTEGER | Which player's turn it is (1 or 2) |
| `winner` | INTEGER | Game result (NULL=ongoing, 0=tie, 1=player1 wins, 2=player2 wins) |
| `created_at` | TIMESTAMP | When the game was created |
| `updated_at` | TIMESTAMP | Last update time |

### Indexes and Constraints

```sql
-- Add index for fast room code lookups
CREATE INDEX idx_games_room_code ON games(room_code);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Real-time Subscriptions

Enable real-time functionality by configuring Row Level Security (RLS):

```sql
-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on games" ON games
FOR ALL USING (true) WITH CHECK (true);
```

### Database Operations

The application performs these key database operations:

1. **Create Game**: Insert new game with generated room code
2. **Join Game**: Update `player2_username` when second player joins
3. **Make Move**: Update `board`, `current_turn`, and potentially `winner`
4. **Reset Game**: Reset `board`, `current_turn`, and `winner` while keeping players
5. **Real-time Updates**: Subscribe to changes for live multiplayer sync

## 🎮 How to Play

1. **Create a Game**: Enter your username and click "Create Game"
2. **Share Room Code**: Give the 6-character code to your friend
3. **Join Game**: Your friend enters the code and their username
4. **Take Turns**: Click columns to drop pieces (red goes first)
5. **Win**: Get 4 pieces in a row (horizontal, vertical, or diagonal)
6. **Play Again**: Use the "Play Again" button to reset the board

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── moves/          # Handle piece placement and game logic
│   │   └── rooms/          # Handle room creation, joining, and reset
│   ├── game/[roomCode]/    # Game interface and real-time sync
│   ├── globals.css         # Global styles and animations
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (create/join game)
└── components/
    └── LoadingScreen.tsx   # Loading component
```

## 🔊 Sound System

The game includes a rich audio feedback system:

- **Piece Placement**: Pleasant "plop" sound when successfully placing a piece
- **Blocked Moves**: Buzzer sound when trying invalid moves
- **Win/Lose**: Musical fanfare for victories, sad tones for defeats
- **Reset**: Ascending notes when starting a new game
- **Click Feedback**: Subtle audio response for interactions

## 🎨 Styling Features

- **Arcade Aesthetic**: Retro gaming inspired design with neon colors
- **Real-time Indicators**: Visual feedback for whose turn it is
- **Hover Effects**: Different styles for valid vs invalid moves
- **Last Move Highlighting**: Glowing ring around recently placed pieces
- **Responsive Design**: Works on both desktop and mobile devices

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables

Set these in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Real-time
- **Audio**: Web Audio API
- **Deployment**: Vercel

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).