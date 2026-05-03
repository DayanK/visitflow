const express = require('express');
const {
  getGraphEntity,
  postGraphEntity,
  deleteGraphEntity,
  getUserCalendarData,
  getUserProfile,
  getUserUsageRights,
  getUserProfileOnBehalfOf,
  getAllContacts,
  getCalendarEvents,
  getDynamicsEntity,
} = require('../controllers/graphController');

const router = express.Router();

// Define your API routes here
router.get('/graph', (req, res) => {
  res.json({ message: 'Graph API running' });
});

router.post('/getGraphEntity', getGraphEntity);
router.post('/postGraphEntity', postGraphEntity);
router.post('/deleteGraphEntity', deleteGraphEntity);
router.post('/getUserCalendarData', getUserCalendarData);
router.post('/getUserProfile', getUserProfile);
router.post('/getUserUsageRights', getUserUsageRights);
router.post('/getUserProfileOnBehalfOf', getUserProfileOnBehalfOf);
router.post('/getAllContacts', getAllContacts);
router.post('/getCalendarEvents', getCalendarEvents);
router.get('/api/dynamics', getDynamicsEntity);

module.exports = router;
