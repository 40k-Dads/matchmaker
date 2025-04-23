DROP TABLE IF EXISTS game_requests;
DROP TABLE IF EXISTS confirmed_games;

CREATE TABLE game_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    game_date TEXT NOT NULL -- Datum des Spieltags im Format 'YYYY-MM-DD'
);

CREATE TABLE confirmed_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    game_date TEXT NOT NULL -- Datum des Spieltags im Format 'YYYY-MM-DD'
);

-- Optional: Index für schnelleren Zugriff nach Datum
CREATE INDEX idx_requests_date ON game_requests (game_date);
CREATE INDEX idx_confirmed_date ON confirmed_games (game_date);