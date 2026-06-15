import { Router } from 'express';
import { toggleLeaderboardStatus } from '../controllers/toggle-leaderboard-status.controller';

const router = Router();

router.post('/', toggleLeaderboardStatus);

export default router;
