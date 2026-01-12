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

        // GET - Listar despesas fixas
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT * FROM fixed_expenses WHERE user_id = $1 ORDER BY day',
                [userId]
            );
            return res.json(result.rows);
        }

        // POST - Criar ou pagar despesa fixa
        if (req.method === 'POST') {
            const { action, id, description, value, day } = req.body;

            // Pagar despesa fixa
            if (action === 'pay' && id) {
                const fixed = await pool.query(
                    'SELECT * FROM fixed_expenses WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (fixed.rows.length === 0) {
                    return res.status(404).json({ error: 'Despesa fixa não encontrada' });
                }

                const expense = fixed.rows[0];

                // Marcar como pago
                await pool.query('UPDATE fixed_expenses SET paid = TRUE WHERE id = $1', [id]);

                // Criar transação
                const today = new Date().toISOString().split('T')[0];
                await pool.query(
                    'INSERT INTO transactions (user_id, type, description, value, date) VALUES ($1, $2, $3, $4, $5)',
                    [userId, 'expense', `${expense.description} (Despesa Fixa)`, expense.value, today]
                );

                return res.json({ paid: true, message: 'Despesa fixa paga' });
            }

            // Resetar pagamentos (novo mês)
            if (action === 'reset') {
                await pool.query('UPDATE fixed_expenses SET paid = FALSE WHERE user_id = $1', [userId]);
                return res.json({ message: 'Status de pagamento resetado' });
            }

            // Criar nova despesa fixa
            if (!description || !value || !day) {
                return badRequest(res, 'Todos os campos são obrigatórios');
            }

            const result = await pool.query(
                'INSERT INTO fixed_expenses (user_id, description, value, day) VALUES ($1, $2, $3, $4) RETURNING id',
                [userId, description, value, day]
            );

            return res.status(201).json({ id: result.rows[0].id, message: 'Despesa fixa criada' });
        }

        // DELETE - Excluir despesa fixa
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (!id) {
                return badRequest(res, 'ID é obrigatório');
            }

            const result = await pool.query(
                'DELETE FROM fixed_expenses WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Despesa fixa não encontrada' });
            }

            return res.json({ message: 'Despesa fixa excluída' });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
