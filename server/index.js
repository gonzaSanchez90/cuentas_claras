import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar la inicialización de BD
import { initDatabase } from './database.js';

// Importar rutas y middleware
import authRoutes from './routes/auth.js';
import monthRoutes from './routes/months.js';
import expenseRoutes from './routes/expenses.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import authMiddleware from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// Middlewares globales
// ============================================================
app.use(cors());
app.use(express.json());

// ============================================================
// Rutas de la API
// ============================================================
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/months', authMiddleware, monthRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// ============================================================
// Servir el frontend en producción
// ============================================================
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// ============================================================
// Iniciar: primero la BD, luego el servidor
// ============================================================
async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀 Cuentas Claras API v1.0            ║
  ║   Corriendo en http://localhost:${PORT}     ║
  ╚══════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('❌ Fatal error al iniciar el servidor:', err);
  process.exit(1);
});
