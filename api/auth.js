const bcrypt = require('bcryptjs');
const { getPool, initDatabase } = require('./_db');
const { generateToken } = require('./_auth');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await initDatabase();
        const pool = getPool();

        if (req.method === 'POST') {
            const { action, name, username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
            }

            if (action === 'register') {
                if (!name) {
                    return res.status(400).json({ error: 'Nome é obrigatório' });
                }

                if (password.length < 4) {
                    return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
                }

                // Verificar se já existe
                const existing = await pool.query(
                    'SELECT id FROM users WHERE username = $1',
                    [username.toLowerCase()]
                );

                if (existing.rows.length > 0) {
                    return res.status(400).json({ error: 'Este usuário já existe' });
                }

                // Criptografar senha
                const hashedPassword = await bcrypt.hash(password, 10);

                // Inserir usuário
                const result = await pool.query(
                    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
                    [username.toLowerCase(), hashedPassword]
                );

                const userId = result.rows[0].id;

                // Criar configurações padrão
                await pool.query(
                    'INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)',
                    [userId, JSON.stringify({ name, savingsPercentage: 20 })]
                );

                const token = generateToken(userId);

                return res.status(201).json({
                    token,
                    user: { id: userId, name, username: username.toLowerCase() }
                });

            } else if (action === 'login') {
                // Login
                const result = await pool.query(
                    'SELECT u.*, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id WHERE u.username = $1',
                    [username.toLowerCase()]
                );

                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const user = result.rows[0];
                const validPassword = await bcrypt.compare(password, user.password);

                if (!validPassword) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const settings = user.settings || {};
                const token = generateToken(user.id);

                return res.json({
                    token,
                    user: {
                        id: user.id,
                        name: settings.name || username,
                        username: user.username
                    }
                });
            } else {
                return res.status(400).json({ error: 'Ação não especificada' });
            }
        }

        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT u.id, u.username, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id ORDER BY u.username'
            );

            const users = result.rows.map(u => ({
                id: u.id,
                name: u.settings?.name || u.username,
                username: u.username
            }));

            return res.json(users);
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        console.error('Auth API Error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

                // Inserir usuário
                const result = await pool.query(
                    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
                    [username.toLowerCase(), hashedPassword]
                );

                const userId = result.rows[0].id;

                // Criar configurações padrão
                await pool.query(
                    'INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)',
                    [userId, JSON.stringify({ name, savingsPercentage: 20 })]
                );

                const token = generateToken(userId);

                return res.status(201).json({
                    token,
                    user: { id: userId, name, username: username.toLowerCase() }
                });

            } else {
                // Login
                const result = await pool.query(
                    'SELECT u.*, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id WHERE u.username = $1',
                    [username.toLowerCase()]
                );

                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const user = result.rows[0];
                const validPassword = await bcrypt.compare(password, user.password);

                if (!validPassword) {
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                const settings = user.settings || {};
                const token = generateToken(user.id);

                return res.json({
                    token,
                    user: {
                        id: user.id,
                        name: settings.name || username,
                        username: user.username
                    }
                });
            }
        }

        // GET /api/auth - Listar usuários
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT u.id, u.username, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id ORDER BY u.username'
            );

            const users = result.rows.map(u => ({
                id: u.id,
                name: u.settings?.name || u.username,
                username: u.username
            }));

            return res.json(users);
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
