import { Router } from 'express';
import { previewSubscriptionUpgrade } from '../controllers/upgrade-subscription-preview.controller';

const router = Router();
router.all('/', previewSubscriptionUpgrade);
export default router;
