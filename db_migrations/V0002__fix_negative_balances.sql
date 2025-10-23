-- Fix negative balances
UPDATE users SET balance_rub = 0 WHERE balance_rub < 0;
UPDATE users SET balance_usd = 0 WHERE balance_usd < 0;

-- Add check constraints to prevent negative balances
ALTER TABLE users ADD CONSTRAINT balance_rub_positive CHECK (balance_rub >= 0);
ALTER TABLE users ADD CONSTRAINT balance_usd_positive CHECK (balance_usd >= 0);