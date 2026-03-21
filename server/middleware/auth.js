import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cuentas-claras-secret-key-2026';

// ============================================================
// Middleware de autenticación
// Verifica el token JWT en el header "Authorization: Bearer <token>"
// Si es válido, adjunta req.userId para que las rutas lo usen
// ============================================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default authMiddleware;
