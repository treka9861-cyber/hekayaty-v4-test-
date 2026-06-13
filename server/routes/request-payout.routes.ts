import { Router } from 'express';
import { requestPayout } from '../controllers/request-payout.controller';

const router = Router();

router.all('/', requestPayout);

export default router;
