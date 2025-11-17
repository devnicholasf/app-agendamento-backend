const admin = require('firebase-admin');

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: 'Token ausente' });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('verifyToken error:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { verifyToken };
