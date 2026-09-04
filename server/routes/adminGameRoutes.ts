import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { createGame, getActiveGame, getGameById, getGameStats } from '../services/gameService.js';
import { db } from '../db.js';

const router = Router();

router.use(requireAdmin);

// Create Game
router.post('/create', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Game name is required' });
      return;
    }

    const game = createGame(name);
    const stats = getGameStats(game.id);

    res.status(201).json({ game, stats });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create game', details: err.message });
  }
});

// Get Active Game State & Stats
router.get('/active', (req: Request, res: Response) => {
  const game = getActiveGame();
  if (!game) {
    res.json({ game: null });
    return;
  }

  const stats = getGameStats(game.id);
  res.json({ game, stats });
});

// Reset All Test Games, Participants & Votes (Clean Slate for Live Event)
router.post('/reset-data', (req: Request, res: Response) => {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM votes').run();
      db.prepare('DELETE FROM game_used_people').run();
      db.prepare('DELETE FROM rounds').run();
      db.prepare('DELETE FROM participants').run();
      db.prepare('DELETE FROM games').run();
    })();

    res.json({ success: true, message: 'All test games, rounds, and participants cleared successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset test data', details: err.message });
  }
});

export default router;
