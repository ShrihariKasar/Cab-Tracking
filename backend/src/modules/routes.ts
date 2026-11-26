import { Router } from 'express';
import * as authCtrl from '../controllers/authController.js';
import * as driverCtrl from '../controllers/driverController.js';
import * as rideCtrl from '../controllers/rideController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

apiRouter.post('/auth/login', authCtrl.login);

apiRouter.get('/drivers', requireAuth, requireAdmin, driverCtrl.listDrivers);
apiRouter.get('/drivers/:id', requireAuth, driverCtrl.getDriverById);
apiRouter.patch('/drivers/:id', requireAuth, driverCtrl.updateDriverProfile);
apiRouter.post('/drivers/:id/location', requireAuth, driverCtrl.postDriverLocation);
apiRouter.get('/drivers/:id/location', requireAuth, requireAdmin, driverCtrl.getDriverLocation);

apiRouter.post('/rides/start', requireAuth, rideCtrl.startRide);
apiRouter.post('/rides/end', requireAuth, rideCtrl.endRide);
apiRouter.get('/rides/active', requireAuth, requireAdmin, rideCtrl.getActiveRides);
