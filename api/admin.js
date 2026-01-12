const { getPool, initDatabase } = require('./_db');
const { ADMIN_PASSWORD, generateAdminToken, verifyAdminToken, serverError } = require('./_auth');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // POST - Login admin
        if (req.method === 'POST') {
            const { password } = req.body;

            if (password !== ADMIN_PASSWORD) {
                return res.status(401).json({ error: 'Senha incorreta' });
            }

            const token = generateAdminToken();
            return res.json({ token, message: 'Login admin realizado' });
        }

        // GET - Obter dados (requer autenticação admin)
        if (req.method === 'GET') {
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace('Bearer ', '');

            if (!token || !verifyAdminToken(token)) {
                return res.status(401).json({ error: 'Não autorizado' });
            }

            await initDatabase();
            const pool = getPool();

            // Buscar todos os dados
            const users = await pool.query(
                'SELECT u.id, u.username, u.created_at, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id ORDER BY u.id'
            );

            const transactions = await pool.query(
                'SELECT * FROM transactions ORDER BY date DESC, id DESC'
            );

            const fixedExpenses = await pool.query(
                'SELECT * FROM fixed_expenses ORDER BY day'
            );

            const installments = await pool.query(
                'SELECT * FROM installments ORDER BY created_at DESC'
            );

            const savings = await pool.query(
                'SELECT * FROM savings_boxes ORDER BY created_at DESC'
            );

            // Formatar usuários
            const usersFormatted = users.rows.map(u => ({
                ...u,
                name: u.settings?.name || u.username
            }));

            return res.json({
                users: usersFormatted,
                transactions: transactions.rows,
                fixedExpenses: fixedExpenses.rows,
                installments: installments.rows,
                savings: savings.rows
            });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
