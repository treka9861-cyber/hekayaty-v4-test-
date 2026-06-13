import { Router } from 'express';
import { updateShipment } from '../controllers/update-shipment.controller';

const router = Router();

router.all('/', updateShipment);

export default router;
