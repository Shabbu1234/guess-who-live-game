import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getActiveGame } from '../services/gameService.js';
import {
  startRound,
  stopVoting,
  revealAnswer,
  endGame,
  getGameAnalytics,
  getLeaderboard
} from '../services/roundService.js';
import { db } from '../db.js';

const router = Router();

router.use(requireAdmin);

// Start New Round (Picks unused person transactionally)
router.post('/start-round', (req: Request, res: Response) => {
  try {
    const game = getActiveGame();
    if (!game) {
      res.status(400).json({ error: 'No active game found. Please create a game first.' });
      return;
    }

    const payload = startRound(game.id);
    res.json({ success: true, round: payload });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Stop Voting
router.post('/stop-voting', (req: Request, res: Response) => {
  try {
    const game = getActiveGame();
    if (!game) {
      res.status(400).json({ error: 'No active game found' });
      return;
    }

    const payload = stopVoting(game.id);
    res.json({ success: true, round: payload });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reveal Answer
router.post('/reveal-answer', (req: Request, res: Response) => {
  try {
    const game = getActiveGame();
    if (!game) {
      res.status(400).json({ error: 'No active game found' });
      return;
    }

    const payload = revealAnswer(game.id);
    res.json({ success: true, result: payload });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// End Game
router.post('/end-game', (req: Request, res: Response) => {
  try {
    const game = getActiveGame();
    if (!game) {
      res.status(400).json({ error: 'No active game found' });
      return;
    }

    const payload = endGame(game.id);
    res.json({ success: true, summary: payload });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Analytics & Round History
router.get('/analytics', (req: Request, res: Response) => {
  const game = getActiveGame();
  if (!game) {
    res.status(404).json({ error: 'No active game found' });
    return;
  }

  const analytics = getGameAnalytics(game.id);
  const leaderboard = getLeaderboard(game.id, 20);

  res.json({ analytics, leaderboard });
});

export default router;
