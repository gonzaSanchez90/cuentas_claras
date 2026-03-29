import { Router } from 'express';
import { dbGet, dbAll } from '../database.js';

const router = Router();

router.get('/months/:id/invite', (req, res) => {
  try {
    const { id } = req.params;
    const month = dbGet('SELECT id, name, creator_id, emoji FROM months WHERE id = ?', [id]);
    if (!month) return res.status(404).json({ error: 'Grupo no encontrado' });

    const participants = dbAll('SELECT id, name, user_id FROM participants WHERE month_id = ?', [id]);
    
    res.json({
      id: month.id,
      name: month.name,
      emoji: month.emoji,
      creatorId: month.creator_id,
      availableSlots: participants.filter(p => p.user_id === null).map(p => ({ id: p.id, name: p.name }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
