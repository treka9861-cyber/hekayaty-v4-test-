import { Router } from 'express';
import { approveSubscription } from '../controllers/approve-subscription.controller';

const router = Router();
router.all('/', approveSubscription);
export default router;
