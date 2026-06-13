import { Router } from 'express';
import { getAllPayouts } from '../controllers/get-all-payouts.controller';

const router = Router();

router.all('/', getAllPayouts);

export default router;
