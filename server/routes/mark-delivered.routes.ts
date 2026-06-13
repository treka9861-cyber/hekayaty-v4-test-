import { Router } from 'express';
import { markDelivered } from '../controllers/mark-delivered.controller';

const router = Router();

router.all('/', markDelivered);

export default router;
