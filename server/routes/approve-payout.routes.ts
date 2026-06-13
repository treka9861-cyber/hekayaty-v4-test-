import { Router } from 'express';
import { approvePayout } from '../controllers/approve-payout.controller';

const router = Router();

router.all('/', approvePayout);

export default router;
