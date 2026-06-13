import { Router } from 'express';
import { sellerOrders } from '../controllers/seller-orders.controller';

const router = Router();

router.all('/', sellerOrders);

export default router;
