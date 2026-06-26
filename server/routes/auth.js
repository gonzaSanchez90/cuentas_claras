import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import authMiddleware from '../middleware/auth.js';
import { dbRun, dbGet } from '../database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cuentas-claras-secret-key-2026';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gonza.fede.sanchez@gmail.com';
const TRIAL_DAYS = 30;

// ============================================================
// POST /api/auth/register  →  Crear cuenta nueva
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Admin nunca expira; el resto tiene TRIAL_DAYS días de prueba
    const expiresAt = email === ADMIN_EMAIL
      ? null
      : new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const result = await dbRun(
      'INSERT INTO users (email, password, name, expires_at) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, expiresAt]
    );

    const userId = result.lastInsertRowid;
    console.log('[AUTH] User registered:', { id: userId, email, name });

    const token = jwt.sign({ userId, email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      token,
      user: { id: userId, email, name }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// POST /api/auth/login  →  Iniciar sesión
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Tu período de prueba expiró. Contactá al administrador para continuar.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// POST /api/auth/forgot-password  →  Enviar link de recuperación
// ============================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await dbGet('SELECT id, email, name FROM users WHERE email = ?', [email]);
    // Siempre respondemos igual para no revelar qué emails existen
    if (!user) return res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const appUrl = `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}?reset_token=${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Recuperar contraseña - Cuentas Claras',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hola ${user.name} 👋</h2>
          <p>Recibiste este mail porque pediste recuperar tu contraseña en <strong>Cuentas Claras</strong>.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Cambiar contraseña
            </a>
          </p>
          <p style="color:#888;font-size:13px">El enlace expira en 1 hora. Si no pediste esto, ignorá este mail.</p>
        </div>
      `,
    });

    res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error al enviar el email de recuperación' });
  }
});

// ============================================================
// POST /api/auth/reset-password  →  Cambiar contraseña con token
// ============================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'El enlace es inválido o ya expiró' });
    }

    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Token inválido' });

    const user = await dbGet('SELECT id FROM users WHERE id = ?', [payload.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, payload.userId]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/auth/me  →  Obtener usuario actual
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
