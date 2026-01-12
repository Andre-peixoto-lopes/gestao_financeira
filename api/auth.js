module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
        return res.status(200).json({ 
            message: 'API Auth funcionando',
            timestamp: new Date().toISOString(),
            hasDbUrl: !!process.env.DATABASE_URL
        });
    }

    if (req.method === 'POST') {
        return res.status(200).json({ 
            message: 'POST recebido',
            body: req.body 
        });
    }

    return res.status(405).json({ error: 'Método não permitido' });
};
