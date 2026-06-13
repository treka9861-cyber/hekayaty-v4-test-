import { Router } from 'express';
import { freezeSeller } from '../controllers/freeze-seller.controller';

const router = Router();

router.all('/', freezeSeller);

export default router;
