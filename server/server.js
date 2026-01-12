// ===== SERVIDOR EXPRESS - API REST =====
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, run, get, all, saveDatabase } = require('./database');
const { generateToken, authMiddleware } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..')));

// ===== ROTAS DE AUTENTICAÇÃO =====

// Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
        }

        // Verificar se usuário já existe
        const existingUser = get('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
        if (existingUser) {
            return res.status(400).json({ error: 'Este usuário já existe' });
        }

        // Criptografar senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário
        const result = run('INSERT INTO users (username, password) VALUES (?, ?)', [username.toLowerCase(), hashedPassword]);

        // Criar configurações padrão
        run('INSERT INTO user_settings (user_id, settings) VALUES (?, ?)', [result.lastInsertRowid, JSON.stringify({ name, savingsPercentage: 20 })]);

        res.status(201).json({ 
            message: 'Usuário criado com sucesso',
            userId: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('Erro ao registrar:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }

        // Buscar usuário
        const user = get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }

        // Buscar configurações para pegar o nome
        const settings = get('SELECT settings FROM user_settings WHERE user_id = ?', [user.id]);
        const settingsData = settings ? JSON.parse(settings.settings) : { name: username };

        // Gerar token
        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                name: settingsData.name || username,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar usuários cadastrados (sem senha)
app.get('/api/auth/users', (req, res) => {
    try {
        const users = all('SELECT u.id, u.username, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id ORDER BY u.username');
        const result = users.map(u => {
            const settings = u.settings ? JSON.parse(u.settings) : {};
            return {
                id: u.id,
                name: settings.name || u.username,
                username: u.username
            };
        });
        res.json(result);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar token e retornar dados do usuário
app.get('/api/auth/me', authMiddleware, (req, res) => {
    try {
        const user = get('SELECT u.id, u.username, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id WHERE u.id = ?', [req.userId]);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const settings = user.settings ? JSON.parse(user.settings) : {};
        res.json({
            id: user.id,
            name: settings.name || user.username,
            username: user.username
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE TRANSAÇÕES =====

// Listar transações do usuário
app.get('/api/transactions', authMiddleware, (req, res) => {
    try {
        const transactions = all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC', [req.userId]);
        res.json(transactions);
    } catch (error) {
        console.error('Erro ao listar transações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar transação
app.post('/api/transactions', authMiddleware, (req, res) => {
    try {
        const { type, value, description, date } = req.body;

        const result = run(
            'INSERT INTO transactions (user_id, type, description, value, date) VALUES (?, ?, ?, ?, ?)',
            [req.userId, type, description, value, date]
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Transação criada' });
    } catch (error) {
        console.error('Erro ao criar transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir transação
app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
    try {
        const result = run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        res.json({ message: 'Transação excluída' });
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE DESPESAS FIXAS =====

// Listar despesas fixas
app.get('/api/fixed-expenses', authMiddleware, (req, res) => {
    try {
        const fixed = all('SELECT * FROM fixed_expenses WHERE user_id = ? ORDER BY day', [req.userId]);
        res.json(fixed);
    } catch (error) {
        console.error('Erro ao listar despesas fixas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar despesa fixa
app.post('/api/fixed-expenses', authMiddleware, (req, res) => {
    try {
        const { description, value, day } = req.body;

        const result = run(
            'INSERT INTO fixed_expenses (user_id, description, value, day) VALUES (?, ?, ?, ?)',
            [req.userId, description, value, day]
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Despesa fixa criada' });
    } catch (error) {
        console.error('Erro ao criar despesa fixa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Marcar despesa fixa como paga
app.post('/api/fixed-expenses/:id/pay', authMiddleware, (req, res) => {
    try {
        const fixedId = req.params.id;

        const fixed = get('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?', [fixedId, req.userId]);
        if (!fixed) {
            return res.status(404).json({ error: 'Despesa fixa não encontrada' });
        }

        // Atualizar como pago
        run('UPDATE fixed_expenses SET paid = 1 WHERE id = ?', [fixedId]);

        // Criar transação
        const date = new Date().toISOString().split('T')[0];
        run(
            'INSERT INTO transactions (user_id, type, description, value, date) VALUES (?, ?, ?, ?, ?)',
            [req.userId, 'expense', `${fixed.description} (Despesa Fixa)`, fixed.value, date]
        );

        res.json({ paid: true, message: 'Despesa fixa paga' });
    } catch (error) {
        console.error('Erro ao pagar despesa fixa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Resetar status de pagamento (novo mês)
app.post('/api/fixed-expenses/reset', authMiddleware, (req, res) => {
    try {
        run('UPDATE fixed_expenses SET paid = 0 WHERE user_id = ?', [req.userId]);
        res.json({ message: 'Status de pagamento resetado' });
    } catch (error) {
        console.error('Erro ao resetar despesas fixas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir despesa fixa
app.delete('/api/fixed-expenses/:id', authMiddleware, (req, res) => {
    try {
        const result = run('DELETE FROM fixed_expenses WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Despesa fixa não encontrada' });
        }

        res.json({ message: 'Despesa fixa excluída' });
    } catch (error) {
        console.error('Erro ao excluir despesa fixa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE PARCELAS =====

// Listar parcelas
app.get('/api/installments', authMiddleware, (req, res) => {
    try {
        const installments = all('SELECT * FROM installments WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(installments);
    } catch (error) {
        console.error('Erro ao listar parcelas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar parcela
app.post('/api/installments', authMiddleware, (req, res) => {
    try {
        const { description, totalValue, installmentValue, totalInstallments, startDate } = req.body;

        const result = run(
            'INSERT INTO installments (user_id, description, total_value, installment_value, total_installments, start_date) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId, description, totalValue, installmentValue, totalInstallments, startDate]
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Parcela criada' });
    } catch (error) {
        console.error('Erro ao criar parcela:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Pagar parcela
app.post('/api/installments/:id/pay', authMiddleware, (req, res) => {
    try {
        const inst = get('SELECT * FROM installments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        
        if (!inst) {
            return res.status(404).json({ error: 'Parcela não encontrada' });
        }

        if (inst.paid_installments >= inst.total_installments) {
            return res.status(400).json({ error: 'Todas as parcelas já foram pagas' });
        }

        // Incrementar parcelas pagas
        const newPaid = inst.paid_installments + 1;
        run('UPDATE installments SET paid_installments = ? WHERE id = ?', [newPaid, inst.id]);

        // Criar transação de despesa
        const date = new Date().toISOString().split('T')[0];
        run(
            'INSERT INTO transactions (user_id, type, description, value, date) VALUES (?, ?, ?, ?, ?)',
            [req.userId, 'expense', `${inst.description} (Parcela ${newPaid}/${inst.total_installments})`, inst.installment_value, date]
        );

        res.json({ 
            paidInstallments: newPaid, 
            message: 'Parcela paga com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao pagar parcela:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir parcela
app.delete('/api/installments/:id', authMiddleware, (req, res) => {
    try {
        const result = run('DELETE FROM installments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Parcela não encontrada' });
        }

        res.json({ message: 'Parcela excluída' });
    } catch (error) {
        console.error('Erro ao excluir parcela:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE CAIXINHAS =====

// Listar caixinhas
app.get('/api/savings', authMiddleware, (req, res) => {
    try {
        const savings = all('SELECT * FROM savings_boxes WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(savings);
    } catch (error) {
        console.error('Erro ao listar caixinhas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar caixinha
app.post('/api/savings', authMiddleware, (req, res) => {
    try {
        const { name, goal, currentValue } = req.body;

        const result = run(
            'INSERT INTO savings_boxes (user_id, name, goal, current_value) VALUES (?, ?, ?, ?)',
            [req.userId, name, goal || 0, currentValue || 0]
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Caixinha criada' });
    } catch (error) {
        console.error('Erro ao criar caixinha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Depositar/Sacar da caixinha
app.post('/api/savings/:id/action', authMiddleware, (req, res) => {
    try {
        const { type, value } = req.body; // type: 'deposit' ou 'withdraw'
        const savingsId = req.params.id;

        const savings = get('SELECT * FROM savings_boxes WHERE id = ? AND user_id = ?', [savingsId, req.userId]);
        if (!savings) {
            return res.status(404).json({ error: 'Caixinha não encontrada' });
        }

        let newAmount = savings.current_value;
        if (type === 'deposit') {
            newAmount += value;
        } else if (type === 'withdraw') {
            if (value > savings.current_value) {
                return res.status(400).json({ error: 'Valor maior que o disponível' });
            }
            newAmount -= value;
        }

        // Atualizar valor
        run('UPDATE savings_boxes SET current_value = ? WHERE id = ?', [newAmount, savingsId]);

        res.json({ currentValue: newAmount, message: 'Operação realizada' });
    } catch (error) {
        console.error('Erro na operação da caixinha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir caixinha
app.delete('/api/savings/:id', authMiddleware, (req, res) => {
    try {
        const result = run('DELETE FROM savings_boxes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Caixinha não encontrada' });
        }

        res.json({ message: 'Caixinha excluída' });
    } catch (error) {
        console.error('Erro ao excluir caixinha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE CONFIGURAÇÕES =====

// Obter configurações do usuário
app.get('/api/settings', authMiddleware, (req, res) => {
    try {
        let settings = get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
        
        if (!settings) {
            run('INSERT INTO user_settings (user_id, settings) VALUES (?, ?)', [req.userId, JSON.stringify({ savingsPercentage: 20 })]);
            settings = { user_id: req.userId, settings: JSON.stringify({ savingsPercentage: 20 }) };
        }

        res.json(JSON.parse(settings.settings));
    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar configurações
app.put('/api/settings', authMiddleware, (req, res) => {
    try {
        const settings = req.body;

        // Buscar configurações atuais
        const current = get('SELECT settings FROM user_settings WHERE user_id = ?', [req.userId]);
        let currentSettings = current ? JSON.parse(current.settings) : {};
        
        // Mesclar configurações
        const newSettings = { ...currentSettings, ...settings };

        if (current) {
            run('UPDATE user_settings SET settings = ? WHERE user_id = ?', [JSON.stringify(newSettings), req.userId]);
        } else {
            run('INSERT INTO user_settings (user_id, settings) VALUES (?, ?)', [req.userId, JSON.stringify(newSettings)]);
        }

        res.json({ message: 'Configurações atualizadas' });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE ADMINISTRADOR =====

// Senha do admin (em produção, use variável de ambiente)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key-financeiro-2024';

// Login admin
app.post('/api/admin/login', async (req, res) => {
    try {
        const { password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: '24h' });

        res.json({ token, message: 'Login admin realizado' });
    } catch (error) {
        console.error('Erro no login admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Middleware admin
function adminMiddleware(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, ADMIN_SECRET);
        
        if (!decoded.admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// Obter todos os dados (admin)
app.get('/api/admin/data', adminMiddleware, (req, res) => {
    try {
        // Buscar todos os usuários
        const users = all('SELECT u.id, u.username, u.created_at, us.settings FROM users u LEFT JOIN user_settings us ON u.id = us.user_id');
        const usersWithNames = users.map(u => {
            const settings = u.settings ? JSON.parse(u.settings) : {};
            return { ...u, name: settings.name || u.username };
        });

        // Buscar todas as transações
        const transactions = all('SELECT * FROM transactions ORDER BY date DESC, id DESC');

        // Buscar todas as despesas fixas
        const fixedExpenses = all('SELECT * FROM fixed_expenses ORDER BY day');

        // Buscar todas as parcelas
        const installments = all('SELECT * FROM installments ORDER BY created_at DESC');

        // Buscar todas as caixinhas
        const savings = all('SELECT * FROM savings_boxes ORDER BY created_at DESC');

        res.json({
            users: usersWithNames,
            transactions,
            fixedExpenses,
            installments,
            savings
        });
    } catch (error) {
        console.error('Erro ao buscar dados admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Servir página admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ===== INICIAR SERVIDOR =====
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 =======================================');
            console.log('   SERVIDOR DE GESTÃO FINANCEIRA');
            console.log('🚀 =======================================');
            console.log(`   📡 API rodando em: http://localhost:${PORT}`);
            console.log(`   📁 Banco de dados: server/financeiro.db`);
            console.log('   🔐 Autenticação: JWT + bcrypt');
            console.log('🚀 =======================================');
            console.log('');
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();
