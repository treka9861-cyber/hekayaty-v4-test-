import { Router } from 'express';
import { getUserBookClaims } from '../controllers/get-user-book-claims.controller';

const router = Router();
router.all('/', getUserBookClaims);
export default router;
