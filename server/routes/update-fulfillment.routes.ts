import { Router } from 'express';
import { updateFulfillment } from '../controllers/update-fulfillment.controller';

const router = Router();

router.all('/', updateFulfillment);

export default router;
