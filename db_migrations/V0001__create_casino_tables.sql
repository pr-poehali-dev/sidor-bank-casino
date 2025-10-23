-- Пользователи
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    pin_code VARCHAR(4) NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    balance_rub DECIMAL(12, 2) DEFAULT 0.00,
    balance_usd DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Заявки на пополнение/вывод
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('RUB', 'USD')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- История игр
CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('roulette', 'mines')),
    bet_amount DECIMAL(12, 2) NOT NULL,
    result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
    win_amount DECIMAL(12, 2) DEFAULT 0.00,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_users_pin ON users(pin_code);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_user ON requests(user_id);
CREATE INDEX idx_game_history_user ON game_history(user_id);