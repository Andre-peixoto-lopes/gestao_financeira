// ===== MIDDLEWARE DE AUTENTICAÇÃO JWT =====
const jwt = require('jsonwebtoken');

// Chave secreta para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = 'sua_chave_secreta_muito_segura_2024_financas';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 dias

// Gerar token JWT
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verificar token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Middleware para proteger rotas
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token mal formatado' });
    }

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Adiciona o userId na requisição
    req.userId = decoded.userId;
    return next();
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    JWT_SECRET
};
