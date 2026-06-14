import { Router } from 'express';
import { getUserUpgradeRequests } from '../controllers/get-user-upgrade-requests.controller';

const router = Router();
router.post('/', getUserUpgradeRequests);
export default router;
