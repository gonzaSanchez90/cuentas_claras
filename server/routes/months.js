import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import nodemailer from 'nodemailer';

const router = Router();

// GET /api/months  →  Listar meses donde el usuario es creador O participante
router.get('/', (req, res) => {
  try {
    const months = dbAll(`
      SELECT DISTINCT m.* 
      FROM months m
      LEFT JOIN participants p ON m.id = p.month_id
      WHERE m.creator_id = ? OR p.user_id = ?
      ORDER BY m.created_at DESC
    `, [req.userId, req.userId]);

    // Llenar los participantes
    const result = months.map(m => {
      const participants = dbAll('SELECT * FROM participants WHERE month_id = ?', [m.id]);
      return {
        id: m.id,
        name: m.name,
        emoji: m.emoji,
        isClosed: !!m.is_closed,
        createdAt: m.created_at,
        creatorId: m.creator_id,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          splitPercentage: p.split_percentage,
          userId: p.user_id
        }))
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error listando meses:', error);
    res.status(500).json({ error: 'Error al obtener los grupos' });
  }
});

// GET /api/months/:id/invite  →  Obtener info de un mes p\xFAblicamente (para invitaciones)
// Esto lo usaremos cuando un usuario invitado pica el enlace
router.get('/:id/invite', (req, res) => {
  try {
    const { id } = req.params;
    const month = dbGet('SELECT id, name, creator_id FROM months WHERE id = ?', [id]);
    if (!month) return res.status(404).json({ error: 'Grupo no encontrado' });

    const participants = dbAll('SELECT id, name, user_id FROM participants WHERE month_id = ?', [id]);
    
    // Devolvemos la info b\xE1sica y los cupos disponibles
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

// POST /api/months/:id/join  →  Unirse a un  mes reclamando un puesto
router.post('/:id/join', (req, res) => {
  try {
    const { id } = req.params;
    const { participantId } = req.body;

    const slot = dbGet('SELECT * FROM participants WHERE id = ? AND month_id = ?', [participantId, id]);
    if (!slot) return res.status(404).json({ error: 'Ese participante no existe' });
    if (slot.user_id) return res.status(400).json({ error: 'Este perfil ya fue reclamado por alguien m\xE1s' });

    // Tambi\xE9n comprobamos si este usuario ya est\xE1 en el mes
    const alreadyIn = dbGet('SELECT id FROM participants WHERE month_id = ? AND user_id = ?', [id, req.userId]);
    if (alreadyIn) return res.status(400).json({ error: 'Ya eres parte de este grupo' });

    dbRun('UPDATE participants SET user_id = ? WHERE id = ?', [req.userId, participantId]);
    res.json({ message: 'Te has unido exitosamente al grupo' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/months/:id/invite-email
router.post('/:id/invite-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, link } = req.body;
    
    const sender = dbGet('SELECT name FROM users WHERE id = ?', [req.userId]);
    if (!sender) return res.status(401).json({ error: 'Usuario no encontrado' });

    let testAccount = await nodemailer.createTestAccount();
    
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    let info = await transporter.sendMail({
      from: '"Cuentas Claras" <no-reply@cuentasclaras.local>',
      to: email,
      subject: `¡${sender.name} te ha invitado a unirte a su grupo!`,
      text: `Hola, tu amigo ${sender.name} te ha invitado a compartir gastos en este mes.\nHaz clic en el siguiente enlace para unirte: ${link}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center; background-color: #0f172a; color: white; border-radius: 12px;">
          <h2>¡Te han invitado a Cuentas Claras!</h2>
          <p style="font-size: 16px;">Hola, tu amigo/a <strong>${sender.name}</strong> te ha invitado a compartir gastos.</p>
          <a href="${link}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Unirme al Grupo</a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${link}</p>
        </div>
      `,
    });

    console.log("Message sent: %s", info.messageId);
    res.json({ message: 'Invitación enviada', previewUrl: nodemailer.getTestMessageUrl(info) });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Error enviando email' });
  }
});

// POST /api/months  →  Crear un mes nuevo con N participantes iniciales
router.post('/', (req, res) => {
  try {
    const { name, emoji, participants } = req.body;
    console.log('[DEBUG] Creando mes:', { name, emoji, participants, userId: req.userId });

    if (!req.userId) {
       return res.status(401).json({ error: 'No tienes permisos (sesion perdida)' });
    }

    if (!name || !participants || participants.length === 0) {
      return res.status(400).json({ error: 'Faltan datos (titulo o participantes)' });
    }

    const monthId = Math.random().toString(36).substring(2, 9);
    
    // Insertar el mes
    dbRun(
      'INSERT INTO months (id, creator_id, name, emoji) VALUES (?, ?, ?, ?)',
      [monthId, req.userId, name, emoji || '📅']
    );

    // Insertar participantes
    participants.forEach(p => {
      const pId = Math.random().toString(36).substring(2, 9);
      const mappedUserId = p.isMe ? req.userId : null;
      dbRun(
        'INSERT INTO participants (id, month_id, user_id, name, split_percentage) VALUES (?, ?, ?, ?, ?)',
        [pId, monthId, mappedUserId, p.name, p.splitPercentage || 0]
      );
    });

    res.status(201).json({ id: monthId, message: 'Creado' });
  } catch (error) {
    console.error('[ERROR] Error creando mes:', error);
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// PUT /api/months/:id  →  Actualizar el mes y reconfigurar proporciones
router.put('/:id', (req, res) => {
  try {
    const { name, emoji, isClosed, participants } = req.body; // array de participants [{id, name, splitPercentage, user_id}]
    const { id } = req.params;

    // Solo creador puede editar
    const month = dbGet('SELECT * FROM months WHERE id = ? AND creator_id = ?', [id, req.userId]);
    if (!month) return res.status(404).json({ error: 'Mes no encontrado o sin permisos' });

    dbRun(
      'UPDATE months SET name = COALESCE(?, name), emoji = COALESCE(?, emoji), is_closed = COALESCE(?, is_closed) WHERE id = ?',
      [name || null, emoji || null, isClosed !== undefined ? (isClosed ? 1 : 0) : null, id]
    );

    // Actualizar o insertar participantes
    if (Array.isArray(participants)) {
      // Borrar los que ya no est\xE1n en el arreglo
      const idsToKeep = participants.filter(p => p.id).map(p => `"${p.id}"`).join(',');
      if (idsToKeep) {
         dbRun(`DELETE FROM participants WHERE month_id = ? AND id NOT IN (${idsToKeep})`, [id]);
      }

      participants.forEach(p => {
        if (p.id) {
          dbRun('UPDATE participants SET name = ?, split_percentage = ? WHERE id = ?', [p.name, p.splitPercentage, p.id]);
        } else {
          dbRun('INSERT INTO participants (id, month_id, user_id, name, split_percentage) VALUES (?, ?, ?, ?, ?)', 
          [Math.random().toString(36).substring(2, 9), id, p.userId || null, p.name, p.splitPercentage]);
        }
      });
    }

    res.json({ message: 'Actualizado' });
  } catch (error) {
    console.error('Error actualizando:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// POST /api/months/:id/reassign  \u2192  Mover gastos de un participante a otro
router.post('/:id/reassign', (req, res) => {
  try {
    const { id } = req.params;
    const { fromParticipantId, toParticipantId } = req.body;

    const month = dbGet('SELECT * FROM months WHERE id = ? AND creator_id = ?', [id, req.userId]);
    if (!month) return res.status(404).json({ error: 'No tienes permisos' });

    dbRun('UPDATE expenses SET payer_participant_id = ? WHERE month_id = ? AND payer_participant_id = ?', 
      [toParticipantId, id, fromParticipantId]
    );

    res.json({ message: 'Gastos reasignados' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reasignar' });
  }
});

// DELETE /api/months/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const month = dbGet('SELECT * FROM months WHERE id = ? AND creator_id = ?', [id, req.userId]);
    if (!month) return res.status(404).json({ error: 'Sin permisos' });

    dbRun('DELETE FROM expenses WHERE month_id = ?', [id]);
    dbRun('DELETE FROM participants WHERE month_id = ?', [id]);
    dbRun('DELETE FROM months WHERE id = ?', [id]);
    
    res.json({ message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
