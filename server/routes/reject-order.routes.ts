import { Router } from 'express';
import { rejectOrder } from '../controllers/reject-order.controller';

const router = Router();

router.all('/', rejectOrder);

export default router;
