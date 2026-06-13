import { Router } from 'express';
import { acceptOrder } from '../controllers/accept-order.controller';

const router = Router();

router.all('/', acceptOrder);

export default router;
