import { Router } from 'express';
import { approveBookClaim } from '../controllers/approve-book-claim.controller';

const router = Router();
router.all('/', approveBookClaim);
export default router;
