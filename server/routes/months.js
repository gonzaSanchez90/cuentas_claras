import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = Router();

// GET /api/months  →  Listar todos los meses del usuario
router.get('/', (req, res) => {
  try {
    const months = dbAll(
      'SELECT * FROM months WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );

    res.json(months.map(m => ({
      id: m.id,
      name: m.name,
      splitRatio: m.split_ratio,
      isClosed: !!m.is_closed,
      createdAt: m.created_at
    })));
  } catch (error) {
    console.error('Error listando meses:', error);
    res.status(500).json({ error: 'Error al obtener los meses' });
  }
});

// POST /api/months  →  Crear un mes nuevo
router.post('/', (req, res) => {
  try {
    const { id, name, splitRatio } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del mes es obligatorio' });
    }

    const monthId = id || Math.random().toString(36).substring(2, 9);

    dbRun(
      'INSERT INTO months (id, user_id, name, split_ratio) VALUES (?, ?, ?, ?)',
      [monthId, req.userId, name, splitRatio || 50]
    );

    res.status(201).json({
      id: monthId,
      name,
      splitRatio: splitRatio || 50,
      isClosed: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creando mes:', error);
    res.status(500).json({ error: 'Error al crear el mes' });
  }
});

// PUT /api/months/:id  →  Actualizar un mes
router.put('/:id', (req, res) => {
  try {
    const { name, splitRatio, isClosed } = req.body;
    const { id } = req.params;

    const month = dbGet('SELECT * FROM months WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!month) {
      return res.status(404).json({ error: 'Mes no encontrado' });
    }

    dbRun(
      `UPDATE months SET 
        name = COALESCE(?, name), 
        split_ratio = COALESCE(?, split_ratio), 
        is_closed = COALESCE(?, is_closed) 
      WHERE id = ?`,
      [name || null, splitRatio || null, isClosed !== undefined ? (isClosed ? 1 : 0) : null, id]
    );

    res.json({ message: 'Mes actualizado' });
  } catch (error) {
    console.error('Error actualizando mes:', error);
    res.status(500).json({ error: 'Error al actualizar el mes' });
  }
});

// DELETE /api/months/:id  →  Eliminar un mes y sus gastos
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const month = dbGet('SELECT * FROM months WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!month) {
      return res.status(404).json({ error: 'Mes no encontrado' });
    }

    // Borrar gastos primero (sql.js no siempre respeta CASCADE)
    dbRun('DELETE FROM expenses WHERE month_id = ?', [id]);
    dbRun('DELETE FROM months WHERE id = ?', [id]);
    res.json({ message: 'Mes eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando mes:', error);
    res.status(500).json({ error: 'Error al eliminar el mes' });
  }
});

export default router;
