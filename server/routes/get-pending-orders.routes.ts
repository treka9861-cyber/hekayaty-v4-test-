import { Router } from 'express';
import { getPendingOrders } from '../controllers/get-pending-orders.controller';

const router = Router();

router.all('/', getPendingOrders);

export default router;
