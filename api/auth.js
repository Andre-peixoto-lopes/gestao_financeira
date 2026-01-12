const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-default';

let pool;
function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

async function initTables() {
    const client = await getPool().connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } finally {
        client.release();
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    try {
        await initTables();
        const db = getPool();

        // GET - Listar usuários
        if (req.method === 'GET') {
            const result = await db.query('SELECT id, username, name FROM users ORDER BY name');
            return res.status(200).json(result.rows);
        }

        // POST - Login ou Register
        if (req.method === 'POST') {
            const { action, name, username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
            }

            if (action === 'register') {
                if (!name) {
                    return res.status(400).json({ error: 'Nome é obrigatório' });
                }

                // Verificar se existe
                const existing = await db.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
                if (existing.rows.length > 0) {
                    return res.status(400).json({ error: 'Este usuário já existe' });
                }

                // Criar usuário
                const hashedPassword = await bcrypt.hash(password, 10);
                const result = await db.query(
                    'INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING id',
                    [username.toLowerCase(), hashedPassword, name]
                );

                const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });

                return res.status(201).json({
                    token,
                    user: { id: result.rows[0].id, name, username: username.toLowerCase() }
                });

            } else {
                // Login
                const result = await db.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
                
                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const user = result.rows[0];
                const validPassword = await bcrypt.compare(password, user.password);

                if (!validPassword) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

                return res.status(200).json({
                    token,
                    user: { id: user.id, name: user.name, username: user.username }
                });
            }
        }

        return res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(500).json({ 
            error: 'Erro interno', 
            details: error.message,
            stack: error.stack,
            dbUrl: process.env.DATABASE_URL ? 'configured' : 'NOT SET'
        });
    }
};
