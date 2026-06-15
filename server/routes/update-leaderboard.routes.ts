import { Router } from 'express';
import { updateLeaderboard } from '../controllers/update-leaderboard.controller';

const router = Router();

router.post('/', updateLeaderboard);

export default router;
