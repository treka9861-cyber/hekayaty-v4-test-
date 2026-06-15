import { Router } from 'express';
import { submitBookClaim } from '../controllers/submit-book-claim.controller';

const router = Router();
router.all('/', submitBookClaim);
export default router;
