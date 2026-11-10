import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db, poolConnection } from './db/index.js';
import { config } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import captureRoutes from './modules/captures/captures.routes.js';
import taskRoutes from './modules/tasks/tasks.routes.js';
import noteRoutes from './modules/notes/notes.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/captures', captureRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'catatdisini backend is running' });
});

app.get('/health', async (req, res) => {
  try {
    await poolConnection.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;