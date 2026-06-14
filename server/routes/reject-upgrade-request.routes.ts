import { Router } from 'express';
import { rejectUpgradeRequest } from '../controllers/reject-upgrade-request.controller';

const router = Router();
router.post('/', rejectUpgradeRequest);
export default router;
