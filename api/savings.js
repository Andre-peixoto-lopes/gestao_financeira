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

        // GET - Listar caixinhas
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT * FROM savings_boxes WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            return res.json(result.rows);
        }

        // POST - Criar caixinha ou depositar/sacar
        if (req.method === 'POST') {
            const { action, id, type, value, name, goal, currentValue } = req.body;

            // Depositar ou sacar
            if (action === 'transaction' && id) {
                const savings = await pool.query(
                    'SELECT * FROM savings_boxes WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (savings.rows.length === 0) {
                    return res.status(404).json({ error: 'Caixinha não encontrada' });
                }

                const box = savings.rows[0];
                let newAmount = parseFloat(box.current_value);

                if (type === 'deposit') {
                    newAmount += parseFloat(value);
                } else if (type === 'withdraw') {
                    if (value > box.current_value) {
                        return badRequest(res, 'Valor maior que o disponível');
                    }
                    newAmount -= parseFloat(value);
                }

                await pool.query(
                    'UPDATE savings_boxes SET current_value = $1 WHERE id = $2',
                    [newAmount, id]
                );

                return res.json({ currentValue: newAmount, message: 'Operação realizada' });
            }

            // Criar nova caixinha
            if (!name) {
                return badRequest(res, 'Nome é obrigatório');
            }

            const result = await pool.query(
                'INSERT INTO savings_boxes (user_id, name, goal, current_value) VALUES ($1, $2, $3, $4) RETURNING id',
                [userId, name, goal || 0, currentValue || 0]
            );

            return res.status(201).json({ id: result.rows[0].id, message: 'Caixinha criada' });
        }

        // DELETE - Excluir caixinha
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (!id) {
                return badRequest(res, 'ID é obrigatório');
            }

            const result = await pool.query(
                'DELETE FROM savings_boxes WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Caixinha não encontrada' });
            }

            return res.json({ message: 'Caixinha excluída' });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
