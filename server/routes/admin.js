import { Router } from 'express';
import { dbAll, dbRun } from '../database.js';

const router = Router();

router.get('/users', async (req, res) => {
  try {
    const users = await dbAll('SELECT id, email, name, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.delete('/users/:id', async (req, res) => {
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
