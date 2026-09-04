import { Router, Request, Response } from 'express';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import { joinGame, getGameByCode, getGameById } from '../services/gameService.js';
import { db } from '../db.js';

const router = Router();

// Participant Join Game
router.post('/join', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const { code, name, session_token } = req.body;

    if (!code || !name) {
      res.status(400).json({ error: 'Game Code and Participant Name are required.' });
      return;
    }

    const participant = joinGame(code, name, session_token);
    const game = getGameById(participant.game_id)!;

    res.json({
      participant_id: participant.id,
      game_id: game.id,
      game_code: game.code,
      game_name: game.name,
      display_name: participant.display_name,
      session_token: participant.session_token,
      score: participant.score,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify Game Code exists
router.get('/verify-code/:code', (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const game = getGameByCode(code);
  if (!game || game.status === 'FINISHED') {
    res.status(404).json({ valid: false, error: 'Invalid or expired Game Code' });
    return;
  }
  res.json({ valid: true, game_name: game.name, game_code: game.code });
});

export default router;
