import { Router } from 'express';
import * as authCtrl from '../controllers/authController.js';
import * as complianceCtrl from '../controllers/complianceController.js';
import * as driverCtrl from '../controllers/driverController.js';
import * as rideCtrl from '../controllers/rideController.js';
import { pool } from '../database/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const apiRouter = Router();

apiRouter.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ ok: false, db: 'error', message: err?.message });
  }
});

apiRouter.post('/auth/login', authCtrl.login);
apiRouter.post('/auth/register', authCtrl.register);

apiRouter.post('/compliance/parental-consent/verify', complianceCtrl.verifyParentalConsent);
apiRouter.post('/compliance/consent/withdraw', (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return requireAuth(req, res, () => complianceCtrl.withdrawConsent(req, res, next));
  }
  return complianceCtrl.withdrawConsent(req, res, next);
});
apiRouter.get('/compliance/privacy-preferences', complianceCtrl.getPrivacyPreferences);
apiRouter.post('/compliance/privacy-preferences', complianceCtrl.savePrivacyPreferences);
apiRouter.get('/compliance/unsubscribe', complianceCtrl.handleUnsubscribeGet);
apiRouter.post('/compliance/unsubscribe', complianceCtrl.handleUnsubscribePost);
apiRouter.post('/compliance/marketing/send', requireAuth, requireAdmin, complianceCtrl.sendMarketingEmailEndpoint);
apiRouter.get('/compliance/marketing/suppression', requireAuth, requireAdmin, complianceCtrl.checkSuppressionStatus);
apiRouter.get('/compliance/my-data', requireAuth, complianceCtrl.exportMyData);
apiRouter.delete('/compliance/account', requireAuth, complianceCtrl.deleteMyAccount);

apiRouter.get('/drivers', requireAuth, requireAdmin, driverCtrl.listDrivers);
apiRouter.get('/drivers/:id', requireAuth, driverCtrl.getDriverById);
apiRouter.patch('/drivers/:id', requireAuth, driverCtrl.updateDriverProfile);
apiRouter.post('/drivers/:id/location', requireAuth, driverCtrl.postDriverLocation);
apiRouter.get('/drivers/:id/location', requireAuth, requireAdmin, driverCtrl.getDriverLocation);

apiRouter.post('/rides/start', requireAuth, rideCtrl.startRide);
apiRouter.post('/rides/end', requireAuth, rideCtrl.endRide);
apiRouter.get('/rides/history', requireAuth, rideCtrl.getRideHistory);
apiRouter.get('/rides/active', requireAuth, requireAdmin, rideCtrl.getActiveRides);
apiRouter.get('/rides/:id/route', requireAuth, requireAdmin, rideCtrl.getRideRoute);
