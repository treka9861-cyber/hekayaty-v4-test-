import { Router } from 'express';
import { getUserSubscriptions } from '../controllers/get-user-subscriptions.controller';

const router = Router();
router.all('/', getUserSubscriptions);
export default router;
