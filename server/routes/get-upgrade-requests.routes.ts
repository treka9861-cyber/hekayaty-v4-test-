import { Router } from 'express';
import { getUpgradeRequests } from '../controllers/get-upgrade-requests.controller';

const router = Router();
router.post('/', getUpgradeRequests);
export default router;
