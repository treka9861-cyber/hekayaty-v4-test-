import { Router } from 'express';
import { earningsOverview } from '../controllers/earnings-overview.controller';

const router = Router();

router.all('/', earningsOverview);

export default router;
