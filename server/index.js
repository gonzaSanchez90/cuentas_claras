import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Evitar que errores no capturados maten el proceso
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});

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

// Middleware para asegurar la inicialización de la BD en entornos Serverless (Vercel)
let isDbInitialized = false;
let dbInitPromise = null;

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && !isDbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase().then(() => {
        isDbInitialized = true;
      }).catch(err => {
        dbInitPromise = null;
        console.error('❌ Error al inicializar base de datos en middleware:', err);
        throw err;
      });
    }
    await dbInitPromise;
  }
  next();
});

// ============================================================
// Servir el frontend en producción (solo si no es Vercel, ya que Vercel sirve static automáticamente)
// ============================================================
if (!process.env.VERCEL) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ============================================================
// Iniciar: primero la BD, luego el servidor (solo en local)
// ============================================================
if (!process.env.VERCEL) {
  async function start() {
    await initDatabase();
    isDbInitialized = true;
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
}

export default app;
