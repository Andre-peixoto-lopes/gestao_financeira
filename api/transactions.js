const { getPool, initDatabase } = require('./_db');
const { getUserFromRequest, unauthorized, badRequest, serverError } = require('./_auth');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

        // GET - Listar transações
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC',
                [userId]
            );
            return res.json(result.rows);
        }

        // POST - Criar transação
        if (req.method === 'POST') {
            const { type, value, description, date, category } = req.body;

            if (!type || !value || !description || !date) {
                return badRequest(res, 'Todos os campos são obrigatórios');
            }

            const result = await pool.query(
                'INSERT INTO transactions (user_id, type, category, description, value, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [userId, type, category || 'outros', description, value, date]
            );

            return res.status(201).json({ id: result.rows[0].id, message: 'Transação criada' });
        }

        // DELETE - Excluir transação
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (!id) {
                return badRequest(res, 'ID é obrigatório');
            }

            const result = await pool.query(
                'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Transação não encontrada' });
            }

            return res.json({ message: 'Transação excluída' });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
