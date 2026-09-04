import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { initWebSocketServer } from './services/websocketService.js';

import adminAuthRoutes from './routes/adminAuthRoutes.js';
import peopleRoutes from './routes/peopleRoutes.js';
import adminGameRoutes from './routes/adminGameRoutes.js';
import adminRoundRoutes from './routes/adminRoundRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import participantVoteRoutes from './routes/participantVoteRoutes.js';

dotenv.config();

// Initialize DB schema & admin user
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads folder exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static File Serving for Uploaded Photos
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/people', peopleRoutes);
app.use('/api/admin/game', adminGameRoutes);
app.use('/api/admin/round', adminRoundRoutes);
app.use('/api/game', participantRoutes);
app.use('/api', participantVoteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build in production
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.resolve(distDir, 'index.html'));
    }
  });
}

// HTTP & WebSocket server creation
const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Guess Who Server running at http://localhost:${PORT}`);
});
