import { Router } from 'express';
import { calculateShipping } from '../controllers/calculate-shipping.controller';

const router = Router();

router.all('/', calculateShipping);

export default router;
