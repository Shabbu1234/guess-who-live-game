import { Router, Request, Response } from 'express';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import { submitVote, getParticipantState } from '../services/roundService.js';
import { getGameByCode, getGameById } from '../services/gameService.js';

const router = Router();

// Submit Vote
router.post('/vote', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const { round_id, participant_id, selected_option } = req.body;

    if (!round_id || !participant_id || !selected_option) {
      res.status(400).json({ error: 'round_id, participant_id, and selected_option are required.' });
      return;
    }

    const result = submitVote(round_id, participant_id, selected_option);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Alias for /vote under /game/vote
router.post('/game/vote', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const { round_id, participant_id, selected_option } = req.body;

    if (!round_id || !participant_id || !selected_option) {
      res.status(400).json({ error: 'round_id, participant_id, and selected_option are required.' });
      return;
    }

    const result = submitVote(round_id, participant_id, selected_option);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Public Participant Game State
router.get('/state', (req: Request, res: Response) => {
  try {
    const { game_code, participant_id } = req.query;

    if (!game_code) {
      res.status(400).json({ error: 'game_code query parameter is required.' });
      return;
    }

    const game = getGameByCode(game_code as string);
    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }

    const state = getParticipantState(game.id, participant_id as string | undefined);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for /state under /game/state
router.get('/game/state', (req: Request, res: Response) => {
  try {
    const { game_code, participant_id } = req.query;

    if (!game_code) {
      res.status(400).json({ error: 'game_code query parameter is required.' });
      return;
    }

    const game = getGameByCode(game_code as string);
    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }

    const state = getParticipantState(game.id, participant_id as string | undefined);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
