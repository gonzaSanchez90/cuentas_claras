import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = Router();

// GET /api/expenses?monthId=xxx  →  Listar gastos
router.get('/', (req, res) => {
  try {
    const { monthId } = req.query;

    let expenses;
    if (monthId) {
      const month = dbGet('SELECT * FROM months WHERE id = ? AND user_id = ?', [monthId, req.userId]);
      if (!month) {
        return res.status(404).json({ error: 'Mes no encontrado' });
      }
      expenses = dbAll(
        'SELECT * FROM expenses WHERE month_id = ? AND user_id = ? ORDER BY date DESC, created_at DESC',
        [monthId, req.userId]
      );
    } else {
      expenses = dbAll(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC',
        [req.userId]
      );
    }

    res.json(expenses.map(e => ({
      id: e.id,
      monthId: e.month_id,
      title: e.title,
      amount: e.amount,
      payer: e.payer,
      date: e.date,
      category: e.category,
      note: e.note
    })));
  } catch (error) {
    console.error('Error listando gastos:', error);
    res.status(500).json({ error: 'Error al obtener los gastos' });
  }
});

// POST /api/expenses  →  Crear un gasto nuevo
router.post('/', (req, res) => {
  try {
    const { id, monthId, title, amount, payer, date, category, note } = req.body;

    if (!monthId || !title || amount === undefined || !payer || !date || !category) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const month = dbGet('SELECT * FROM months WHERE id = ? AND user_id = ?', [monthId, req.userId]);
    if (!month) {
      return res.status(404).json({ error: 'Mes no encontrado' });
    }

    const expenseId = id || Math.random().toString(36).substring(2, 9);

    dbRun(
      'INSERT INTO expenses (id, month_id, user_id, title, amount, payer, date, category, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [expenseId, monthId, req.userId, title, amount, payer, date, category, note || null]
    );

    res.status(201).json({ id: expenseId, monthId, title, amount, payer, date, category, note });
  } catch (error) {
    console.error('Error creando gasto:', error);
    res.status(500).json({ error: 'Error al crear el gasto' });
  }
});

// DELETE /api/expenses/:id  →  Eliminar un gasto
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const expense = dbGet('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    dbRun('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
});

// PUT /api/expenses/:id  →  Actualizar un gasto
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, payer, date, category, note } = req.body;

    const expense = dbGet('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    dbRun(
      `UPDATE expenses SET 
        title = COALESCE(?, title), 
        amount = COALESCE(?, amount), 
        payer = COALESCE(?, payer), 
        date = COALESCE(?, date), 
        category = COALESCE(?, category), 
        note = COALESCE(?, note) 
      WHERE id = ?`,
      [title || null, amount || null, payer || null, date || null, category || null, note || null, id]
    );

    res.json({ message: 'Gasto actualizado' });
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    res.status(500).json({ error: 'Error al actualizar el gasto' });
  }
});

export default router;
