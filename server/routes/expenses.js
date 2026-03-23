import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = Router();

// GET /api/expenses
router.get('/', (req, res) => {
  try {
    const { monthId } = req.query;

    let expenses;
    if (monthId) {
      const check = dbGet(`
        SELECT m.id 
        FROM months m 
        LEFT JOIN participants p ON m.id = p.month_id 
        WHERE m.id = ? AND (m.creator_id = ? OR p.user_id = ?)
      `, [monthId, req.userId, req.userId]);

      if (!check) return res.status(404).json({ error: 'Grupo no encontrado o no tienes acceso' });

      expenses = dbAll(`
        SELECT e.*, p.name as payer_name 
        FROM expenses e
        JOIN participants p ON e.payer_participant_id = p.id
        WHERE e.month_id = ? 
        ORDER BY e.date DESC, e.created_at DESC
      `, [monthId]);
    } else {
      expenses = dbAll(`
        SELECT DISTINCT e.*, p.name as payer_name
        FROM expenses e
        JOIN participants p ON e.payer_participant_id = p.id
        JOIN months m ON e.month_id = m.id
        WHERE m.creator_id = ? OR p.user_id = ?
        ORDER BY e.date DESC, e.created_at DESC
      `, [req.userId, req.userId]);
    }

    res.json(expenses.map(e => ({
      id: e.id,
      monthId: e.month_id,
      title: e.title,
      amount: e.amount,
      payerParticipantId: e.payer_participant_id,
      payerName: e.payer_name,
      date: e.date,
      category: e.category,
      note: e.note,
      createdBy: e.created_by
    })));
  } catch (error) {
    console.error('Error listando gastos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/expenses
router.post('/', (req, res) => {
  try {
    const { monthId, title, amount, payerParticipantId, date, category, note } = req.body;

    if (!monthId || !title || amount === undefined || !payerParticipantId || !date || !category) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Verificar que el usuario tiene acceso a este mes (es creador o tiene un slot de participante)
    const hasAccess = dbGet(`
      SELECT 1 FROM months WHERE id = ? AND creator_id = ?
      UNION
      SELECT 1 FROM participants WHERE month_id = ? AND user_id = ?
      LIMIT 1
    `, [monthId, req.userId, monthId, req.userId]);
    if (!hasAccess) return res.status(403).json({ error: 'No tienes acceso a este grupo' });

    // Verificar si el que paga existe en el grupo
    const validParticipant = dbGet('SELECT * FROM participants WHERE id = ? AND month_id = ?', [payerParticipantId, monthId]);
    if (!validParticipant) return res.status(400).json({ error: 'Ese participante no pertenece al grupo' });

    const expenseId = Math.random().toString(36).substring(2, 9);

    dbRun(
      'INSERT INTO expenses (id, month_id, created_by, payer_participant_id, title, amount, date, category, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [expenseId, monthId, req.userId, payerParticipantId, title, amount, date, category, note || null]
    );

    res.status(201).json({ 
      id: expenseId, 
      monthId,
      payerName: validParticipant.name,
      title, 
      amount, 
      payerParticipantId, 
      date, 
      category, 
      note,
      createdBy: req.userId
    });
  } catch (error) {
    console.error('Error creando gasto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, payerParticipantId, date, category, note } = req.body;

    const expense = dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

    // Creador del gasto puede editarlo
    if (expense.created_by !== req.userId) {
       // O el creador del mes
       const month = dbGet('SELECT creator_id FROM months WHERE id = ?', [expense.month_id]);
       if (month.creator_id !== req.userId) {
          return res.status(403).json({ error: 'Sin permisos para editar este gasto' });
       }
    }

    // Verificar si el nuevo pagador pertenece al grupo si se cambia
    if (payerParticipantId) {
        const validParticipant = dbGet('SELECT * FROM participants WHERE id = ? AND month_id = ?', [payerParticipantId, expense.month_id]);
        if (!validParticipant) return res.status(400).json({ error: 'El participante no pertenece a este grupo' });
    }

    dbRun(`
      UPDATE expenses 
      SET 
        title = COALESCE(?, title),
        amount = COALESCE(?, amount),
        payer_participant_id = COALESCE(?, payer_participant_id),
        date = COALESCE(?, date),
        category = COALESCE(?, category),
        note = COALESCE(?, note)
      WHERE id = ?
    `, [title ?? null, amount ?? null, payerParticipantId ?? null, date ?? null, category ?? null, note ?? null, id]);

    res.json({ message: 'Gasto actualizado' });
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    res.status(500).json({ error: 'Error interno: ' + (error?.message || error?.toString() || 'Error desconocido') });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const expense = dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

    // Creador del mes o creador del gasto
    const month = dbGet('SELECT creator_id FROM months WHERE id = ?', [expense.month_id]);
    if (month.creator_id !== req.userId && expense.created_by !== req.userId) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    dbRun('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

export default router;
