import { Router } from 'express';
import { debugOrders } from '../controllers/debug-orders.controller';

const router = Router();

router.all('/', debugOrders);

export default router;
