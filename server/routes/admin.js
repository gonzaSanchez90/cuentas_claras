import { Router } from 'express';
import { dbAll, dbRun } from '../database.js';

const router = Router();

router.get('/users', (req, res) => {
  try {
    const users = dbAll('SELECT id, email, name, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbRun('DELETE FROM expenses WHERE created_by = ?', [id]);
    dbRun('DELETE FROM months WHERE creator_id = ?', [id]);
    dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

export default router;
