import { Router } from 'express';
import { dbAll, dbRun } from '../database.js';

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gonza.fede.sanchez@gmail.com';

// Middleware que verifica que el usuario sea el admin
function requireAdmin(req, res, next) {
  if (req.userEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

router.get('/me', (req, res) => {
  res.json({ isAdmin: req.userEmail === ADMIN_EMAIL });
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await dbAll('SELECT id, email, name, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM expenses WHERE created_by = ?', [id]);
    await dbRun('DELETE FROM months WHERE creator_id = ?', [id]);
    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

export default router;
