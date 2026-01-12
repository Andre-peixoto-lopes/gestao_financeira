const { getPool, initDatabase } = require('./_db');
const { getUserFromRequest, unauthorized, serverError } = require('./_auth');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const userId = getUserFromRequest(req);
    if (!userId) {
        return unauthorized(res);
    }

    try {
        await initDatabase();
        const pool = getPool();

        // GET - Obter configurações
        if (req.method === 'GET') {
            let result = await pool.query(
                'SELECT settings FROM user_settings WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                // Criar configurações padrão
                await pool.query(
                    'INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)',
                    [userId, JSON.stringify({ savingsPercentage: 20 })]
                );
                return res.json({ savingsPercentage: 20 });
            }

            return res.json(result.rows[0].settings || { savingsPercentage: 20 });
        }

        // PUT - Atualizar configurações
        if (req.method === 'PUT') {
            const newSettings = req.body;

            // Buscar configurações atuais
            const current = await pool.query(
                'SELECT settings FROM user_settings WHERE user_id = $1',
                [userId]
            );

            let settings = current.rows.length > 0 ? (current.rows[0].settings || {}) : {};
            settings = { ...settings, ...newSettings };

            if (current.rows.length > 0) {
                await pool.query(
                    'UPDATE user_settings SET settings = $1 WHERE user_id = $2',
                    [JSON.stringify(settings), userId]
                );
            } else {
                await pool.query(
                    'INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)',
                    [userId, JSON.stringify(settings)]
                );
            }

            return res.json({ message: 'Configurações atualizadas' });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
