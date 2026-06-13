import { Router } from 'express';
import { rejectOrderItem } from '../controllers/reject-order-item.controller';

const router = Router();

router.all('/', rejectOrderItem);

export default router;
