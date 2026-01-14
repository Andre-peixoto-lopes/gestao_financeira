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

        // GET - Listar parcelas
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT * FROM installments WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            return res.json(result.rows);
        }

        // POST - Criar ou pagar parcela
        if (req.method === 'POST') {
            const { action, id, description, totalValue, installmentValue, totalInstallments, startDate } = req.body;

            // Pagar parcela
            if (action === 'pay' && id) {
                const inst = await pool.query(
                    'SELECT * FROM installments WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (inst.rows.length === 0) {
                    return res.status(404).json({ error: 'Parcela não encontrada' });
                }

                const installment = inst.rows[0];

                if (installment.paid_installments >= installment.total_installments) {
                    return badRequest(res, 'Todas as parcelas já foram pagas');
                }

                const newPaid = installment.paid_installments + 1;

                // Atualizar parcelas pagas
                await pool.query(
                    'UPDATE installments SET paid_installments = $1 WHERE id = $2',
                    [newPaid, id]
                );

                // Criar transação de despesa
                const today = new Date().toISOString().split('T')[0];
                await pool.query(
                    'INSERT INTO transactions (user_id, type, description, value, date) VALUES ($1, $2, $3, $4, $5)',
                    [userId, 'expense', `${installment.description} (Parcela ${newPaid}/${installment.total_installments})`, installment.installment_value, today]
                );

                return res.json({ paidInstallments: newPaid, message: 'Parcela paga com sucesso' });
            }

            // Criar nova parcela
            if (!description || !totalValue || !installmentValue || !totalInstallments || !startDate) {
                return badRequest(res, 'Todos os campos são obrigatórios');
            }

            const { category, paidInstallments } = req.body;

            const result = await pool.query(
                'INSERT INTO installments (user_id, description, category, total_value, installment_value, total_installments, paid_installments, start_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [userId, description, category || 'outros', totalValue, installmentValue, totalInstallments, paidInstallments || 0, startDate]
            );

            return res.status(201).json({ id: result.rows[0].id, message: 'Parcela criada' });
        }

        // DELETE - Excluir parcela
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (!id) {
                return badRequest(res, 'ID é obrigatório');
            }

            const result = await pool.query(
                'DELETE FROM installments WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Parcela não encontrada' });
            }

            return res.json({ message: 'Parcela excluída' });
        }

        res.status(405).json({ error: 'Método não permitido' });

    } catch (error) {
        serverError(res, error);
    }
};
