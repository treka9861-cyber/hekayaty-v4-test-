import { Router } from 'express';
import { upgradeSubscription } from '../controllers/upgrade-subscription.controller';

const router = Router();
router.all('/', upgradeSubscription);
export default router;
