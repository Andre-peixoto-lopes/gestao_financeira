const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET 
const ADMIN_SECRET = process.env.ADMIN_SECRET 
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD 

function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function generateAdminToken() {
    return jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: '24h' });
}

function verifyAdminToken(token) {
    try {
        const decoded = jwt.verify(token, ADMIN_SECRET);
        return decoded.admin === true;
    } catch {
        return false;
    }
}

// Middleware para extrair userId do token
function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    return decoded ? decoded.userId : null;
}

// Helper para respostas de erro
function unauthorized(res) {
    res.status(401).json({ error: 'Não autorizado' });
}

function badRequest(res, message) {
    res.status(400).json({ error: message });
}

function serverError(res, error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = {
    JWT_SECRET,
    ADMIN_SECRET,
    ADMIN_PASSWORD,
    generateToken,
    verifyToken,
    generateAdminToken,
    verifyAdminToken,
    getUserFromRequest,
    unauthorized,
    badRequest,
    serverError
};
