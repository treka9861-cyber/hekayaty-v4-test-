import { Router } from 'express';
import { checkout } from '../controllers/checkout.controller';

const router = Router();

router.all('/', checkout);

export default router;
