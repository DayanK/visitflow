const express = require('express');
const { getContactCoordinates, routePlanning } = require('../controllers/routePlanningController');
const { getAllSettings, storeSettings } = require('../controllers/userSettingsController');
const { getAllVisits, storeVisit, updateVisit, deleteVisit } = require('../controllers/visitReportController');

const router = express.Router();

// ─── Geocoding ────────────────────────────────────────────────────────────────
router.post('/ContactCordinate', getContactCoordinates);

// ─── Route Optimization ───────────────────────────────────────────────────────
router.post('/RoutePlanning', routePlanning);

// ─── User Settings ────────────────────────────────────────────────────────────
router.post('/GetAllUserSettings', getAllSettings);
router.post('/StoreUserSettings', storeSettings);

// ─── Visit Reports ────────────────────────────────────────────────────────────
router.get('/GetAllVisitReportByUser/:userId', getAllVisits);
router.post('/StoreUserVisitReport', storeVisit);
router.post('/UpdateUserVisitReportByAppointmentId', updateVisit);
router.delete('/DeleteUserVisitReportByAppointmentId/:appointmentId', deleteVisit);

module.exports = router;
