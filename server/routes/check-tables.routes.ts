import { Router } from 'express';
import { checkTables } from '../controllers/check-tables.controller';

const router = Router();

router.all('/', checkTables);

export default router;
