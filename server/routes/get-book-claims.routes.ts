import { Router } from 'express';
import { getBookClaims } from '../controllers/get-book-claims.controller';

const router = Router();
router.all('/', getBookClaims);
export default router;
