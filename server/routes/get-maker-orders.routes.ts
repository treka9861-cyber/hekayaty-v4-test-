import { Router } from 'express';
import { getMakerOrders } from '../controllers/get-maker-orders.controller';

const router = Router();

router.all('/', getMakerOrders);

export default router;
