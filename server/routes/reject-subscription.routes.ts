import { Router } from 'express';
import { rejectSubscription } from '../controllers/reject-subscription.controller';

const router = Router();
router.all('/', rejectSubscription);
export default router;
