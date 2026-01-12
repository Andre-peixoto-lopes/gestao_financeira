const { Pool } = require('pg');

// Pool de conexões PostgreSQL
let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}

// Inicializar tabelas
async function initDatabase() {
    const client = await getPool().connect();
    try {
        // Tabela de usuários
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de configurações
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                settings JSONB DEFAULT '{}'::jsonb
            )
        `);

        // Tabela de transações
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL,
                description VARCHAR(255) NOT NULL,
                value DECIMAL(12,2) NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de despesas fixas
        await client.query(`
            CREATE TABLE IF NOT EXISTS fixed_expenses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                description VARCHAR(255) NOT NULL,
                value DECIMAL(12,2) NOT NULL,
                day INTEGER NOT NULL,
                paid BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de parcelas
        await client.query(`
            CREATE TABLE IF NOT EXISTS installments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                description VARCHAR(255) NOT NULL,
                total_value DECIMAL(12,2) NOT NULL,
                installment_value DECIMAL(12,2) NOT NULL,
                total_installments INTEGER NOT NULL,
                paid_installments INTEGER DEFAULT 0,
                start_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de caixinhas
        await client.query(`
            CREATE TABLE IF NOT EXISTS savings_boxes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                goal DECIMAL(12,2) DEFAULT 0,
                current_value DECIMAL(12,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Banco de dados inicializado!');
    } finally {
        client.release();
    }
}

module.exports = { getPool, initDatabase };
