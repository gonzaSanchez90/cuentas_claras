import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const router = Router();

// GET /api/months  →  Listar meses donde el usuario es creador O participante
router.get('/', async (req, res) => {
  try {
    const months = await dbAll(`
      SELECT DISTINCT m.* 
      FROM months m
      LEFT JOIN participants p ON m.id = p.month_id
      WHERE m.creator_id = ? OR p.user_id = ?
      ORDER BY m.created_at DESC
    `, [req.userId, req.userId]);

    // Llenar los participantes
    const result = [];
    for (const m of months) {
      const participants = await dbAll('SELECT * FROM participants WHERE month_id = ?', [m.id]);
      result.push({
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
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error listando meses:', error);
    res.status(500).json({ error: 'Error al obtener los grupos' });
  }
});

// GET /api/months/:id/invite  →  Obtener info de un mes p\xFAblicamente (para invitaciones)
// Esto lo usaremos cuando un usuario invitado pica el enlace
router.get('/:id/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const month = await dbGet('SELECT id, name, creator_id FROM months WHERE id = ?', [id]);
    if (!month) return res.status(404).json({ error: 'Grupo no encontrado' });

    const participants = await dbAll('SELECT id, name, user_id FROM participants WHERE month_id = ?', [id]);
    
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
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId } = req.body;

    const slot = await dbGet('SELECT * FROM participants WHERE id = ? AND month_id = ?', [participantId, id]);
    if (!slot) return res.status(404).json({ error: 'Ese participante no existe' });
    if (slot.user_id) return res.status(400).json({ error: 'Este perfil ya fue reclamado por alguien m\xE1s' });

    // Tambi\xE9n comprobamos si este usuario ya est\xE1 en el mes
    const alreadyIn = await dbGet('SELECT id FROM participants WHERE month_id = ? AND user_id = ?', [id, req.userId]);
    if (alreadyIn) return res.status(400).json({ error: 'Ya eres parte de este grupo' });

    await dbRun('UPDATE participants SET user_id = ? WHERE id = ?', [req.userId, participantId]);
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

    if (!email || !link) {
      return res.status(400).json({ error: 'Email y link son obligatorios' });
    }

    const sender = await dbGet('SELECT name FROM users WHERE id = ?', [req.userId]);
    if (!sender) return res.status(401).json({ error: 'Usuario no encontrado' });

    const month = await dbGet('SELECT id, creator_id, name FROM months WHERE id = ?', [id]);
    if (!month) return res.status(404).json({ error: 'Grupo no encontrado' });

    const canAccessMonth = (await dbGet(
      'SELECT id FROM months WHERE id = ? AND creator_id = ?',
      [id, req.userId]
    )) || (await dbGet(
      'SELECT id FROM participants WHERE month_id = ? AND user_id = ?',
      [id, req.userId]
    ));

    if (!canAccessMonth) {
      return res.status(403).json({ error: 'No tienes permisos para invitar a este grupo' });
    }

    const {
      EMAIL_MODE,
      RESEND_API_KEY,
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
    } = process.env;

    const simulateInvite = (reason) => {
      console.log('[EMAIL][DEMO] Invitacion simulada:', {
        reason,
        monthId: id,
        monthName: month.name,
        sender: sender.name,
        email,
        link,
      });

      return res.json({
        message: `Invitacion simulada para ${email}. Comparte el enlace manualmente si hace falta.`,
        simulated: true,
        inviteLink: link,
      });
    };

    const from = SMTP_FROM || 'Cuentas Claras <onboarding@resend.dev>';
    const subject = `¡${sender.name} te ha invitado a unirte a su grupo!`;
    const text = `Hola, ${sender.name} te ha invitado a compartir gastos.\nHaz clic aquí para unirte: ${link}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #0f172a; color: white; border-radius: 16px;">
        <h2 style="margin-top: 0; color: #a5b4fc;">¡Te han invitado a Cuentas Claras!</h2>
        <p style="font-size: 16px; color: #e2e8f0;">Tu amigo/a <strong>${sender.name}</strong> te ha invitado a compartir y gestionar gastos juntos.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">Unirme al Grupo</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/><span style="color: #94a3b8;">${link}</span></p>
      </div>
    `;

    if ((EMAIL_MODE || 'demo').toLowerCase() === 'demo') {
      return simulateInvite('EMAIL_MODE=demo');
    }

    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from,
        to: [email],
        subject,
        text,
        html,
      });

      if (error) {
        console.error('[EMAIL] Error Resend:', error);
        return simulateInvite(`Resend fallo: ${error.message || 'error desconocido'}`);
      }

      console.log('[EMAIL] Invitación enviada con Resend a:', email, '| ID:', data?.id);
      return res.json({ message: 'Invitación enviada correctamente' });
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('[EMAIL] No hay RESEND_API_KEY ni variables SMTP configuradas.');
      return simulateInvite('Sin proveedor configurado');
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: parseInt(SMTP_PORT || '587') === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    console.log('[EMAIL] Invitación enviada a:', email, '| ID:', info.messageId);
    res.json({ message: 'Invitación enviada correctamente' });
  } catch (error) {
    console.error('[EMAIL] Error enviando email:', error);
    return res.json({
      message: `Invitacion simulada. Motivo: ${error?.message || 'error desconocido'}`,
      simulated: true,
      inviteLink: req.body?.link,
    });
  }
});

// POST /api/months  →  Crear un mes nuevo con N participantes iniciales
router.post('/', async (req, res) => {
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
    await dbRun(
      'INSERT INTO months (id, creator_id, name, emoji) VALUES (?, ?, ?, ?)',
      [monthId, req.userId, name, emoji || '📅']
    );

    // Insertar participantes
    for (const p of participants) {
      const pId = Math.random().toString(36).substring(2, 9);
      const mappedUserId = p.isMe ? req.userId : null;
      await dbRun(
        'INSERT INTO participants (id, month_id, user_id, name, split_percentage) VALUES (?, ?, ?, ?, ?)',
        [pId, monthId, mappedUserId, p.name, p.splitPercentage || 0]
      );
    }

    res.status(201).json({ id: monthId, message: 'Creado' });
  } catch (error) {
    console.error('[ERROR] Error creando mes:', error);
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// PUT /api/months/:id  →  Actualizar el mes y reconfigurar proporciones
router.put('/:id', async (req, res) => {
  try {
    const { name, emoji, isClosed, participants } = req.body; // array de participants [{id, name, splitPercentage, user_id}]
    const { id } = req.params;

    const month = await dbGet('SELECT * FROM months WHERE id = ?', [id]);
    if (!month) return res.status(404).json({ error: 'Mes no encontrado' });

    const isCreator = month.creator_id === req.userId;
    const isParticipant = !!(await dbGet('SELECT id FROM participants WHERE month_id = ? AND user_id = ?', [id, req.userId]));

    if (!isCreator && !isParticipant) {
      return res.status(404).json({ error: 'Mes no encontrado o sin permisos' });
    }

    const currentClosed = !!month.is_closed;
    const requestedClosed = isClosed !== undefined ? !!isClosed : currentClosed;
    const requestedName = name ?? month.name;
    const requestedEmoji = emoji ?? month.emoji;

    if (!isCreator) {
      const touchedDetails = requestedName !== month.name || requestedEmoji !== month.emoji || requestedClosed !== currentClosed;
      if (touchedDetails) {
        return res.status(403).json({ error: 'Solo el creador puede editar los detalles del cálculo' });
      }
    }

    if (isCreator) {
      await dbRun(
        'UPDATE months SET name = COALESCE(?, name), emoji = COALESCE(?, emoji), is_closed = COALESCE(?, is_closed) WHERE id = ?',
        [name || null, emoji || null, isClosed !== undefined ? (isClosed ? 1 : 0) : null, id]
      );
    }

    // Actualizar o insertar participantes
    if (Array.isArray(participants)) {
      // Borrar los que ya no est\xE1n en el arreglo
      const idsToKeep = participants.filter(p => p.id).map(p => `"${p.id}"`).join(',');
      if (idsToKeep) {
         await dbRun(`DELETE FROM participants WHERE month_id = ? AND id NOT IN (${idsToKeep})`, [id]);
      }

      for (const p of participants) {
        if (p.id) {
          await dbRun('UPDATE participants SET name = ?, split_percentage = ? WHERE id = ?', [p.name, p.splitPercentage, p.id]);
        } else {
          await dbRun('INSERT INTO participants (id, month_id, user_id, name, split_percentage) VALUES (?, ?, ?, ?, ?)', 
          [Math.random().toString(36).substring(2, 9), id, p.userId || null, p.name, p.splitPercentage]);
        }
      }
    }

    res.json({ message: 'Actualizado' });
  } catch (error) {
    console.error('Error actualizando:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// POST /api/months/:id/reassign  \u2192  Mover gastos de un participante a otro
router.post('/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromParticipantId, toParticipantId } = req.body;

    const month = await dbGet('SELECT * FROM months WHERE id = ? AND creator_id = ?', [id, req.userId]);
    if (!month) return res.status(404).json({ error: 'No tienes permisos' });

    await dbRun('UPDATE expenses SET payer_participant_id = ? WHERE month_id = ? AND payer_participant_id = ?', 
      [toParticipantId, id, fromParticipantId]
    );

    res.json({ message: 'Gastos reasignados' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reasignar' });
  }
});

// DELETE /api/months/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const month = await dbGet('SELECT * FROM months WHERE id = ? AND creator_id = ?', [id, req.userId]);
    if (!month) return res.status(404).json({ error: 'Sin permisos' });

    await dbRun('DELETE FROM expenses WHERE month_id = ?', [id]);
    await dbRun('DELETE FROM participants WHERE month_id = ?', [id]);
    await dbRun('DELETE FROM months WHERE id = ?', [id]);
    
    res.json({ message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
