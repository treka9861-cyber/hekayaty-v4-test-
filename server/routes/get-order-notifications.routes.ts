import { Router } from 'express';
import { getOrderNotifications } from '../controllers/get-order-notifications.controller';

const router = Router();

router.all('/', getOrderNotifications);

export default router;
