import { Router } from 'express';
import { getSellers } from '../controllers/get-sellers.controller';

const router = Router();

router.all('/', getSellers);

export default router;
