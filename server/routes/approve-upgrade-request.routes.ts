import { Router } from 'express';
import { approveUpgradeRequest } from '../controllers/approve-upgrade-request.controller';

const router = Router();
router.post('/', approveUpgradeRequest);
export default router;
