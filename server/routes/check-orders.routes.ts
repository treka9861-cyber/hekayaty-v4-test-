import { Router } from 'express';
import { checkOrders } from '../controllers/check-orders.controller';

const router = Router();

router.all('/', checkOrders);

export default router;
