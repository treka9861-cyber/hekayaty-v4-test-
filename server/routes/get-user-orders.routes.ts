import { Router } from 'express';
import { getUserOrders } from '../controllers/get-user-orders.controller';

const router = Router();

router.all('/', getUserOrders);

export default router;
