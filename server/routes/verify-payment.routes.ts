import { Router } from 'express';
import { verifyPayment } from '../controllers/verify-payment.controller';

const router = Router();

router.all('/', verifyPayment);

export default router;
