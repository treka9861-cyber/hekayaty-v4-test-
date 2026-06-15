import { Router } from 'express';
import { rejectBookClaim } from '../controllers/reject-book-claim.controller';

const router = Router();
router.all('/', rejectBookClaim);
export default router;
