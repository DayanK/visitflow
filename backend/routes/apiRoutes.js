const express = require('express');
const { getContactCoordinates, routePlanning } = require('../controllers/routePlanningController');
const { getAllSettings, storeSettings } = require('../controllers/userSettingsController');
const { getAllVisits, storeVisit, updateVisit, deleteVisit } = require('../controllers/visitReportController');
const { getNote, getAllNotes, storeNote } = require('../controllers/contactNotesController');
const { getRoutes, storeRoute, removeRoute } = require('../controllers/routeHistoryController');

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

// ─── Contact Notes ────────────────────────────────────────────────────────────
router.get('/GetAllContactNotes/:userId', getAllNotes);
router.get('/GetContactNote/:userId/:contactId', getNote);
router.post('/StoreContactNote', storeNote);

// ─── Route History ────────────────────────────────────────────────────────────
router.get('/GetRouteHistory/:userId', getRoutes);
router.post('/SaveRoute', storeRoute);
router.delete('/DeleteRoute/:userId/:routeId', removeRoute);

module.exports = router;
