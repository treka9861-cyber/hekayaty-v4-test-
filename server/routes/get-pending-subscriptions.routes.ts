import { Router } from 'express';
import { getPendingSubscriptions } from '../controllers/get-pending-subscriptions.controller';

const router = Router();
router.all('/', getPendingSubscriptions);
export default router;
