const { v4: uuidv4 } = require('uuid');
const {
  getAllVisitReportsByUser,
  createVisitReport,
  updateVisitReport,
  deleteVisitReport,
} = require('../services/tableStorageService');

/**
 * GET /GetAllVisitReportByUser/:userId
 * Output: IVisit[]
 */
const getAllVisits = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const visits = await getAllVisitReportsByUser(userId);
    res.json(visits);
  } catch (err) {
    console.error('getAllVisits error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /StoreUserVisitReport
 * Input:  IVisit (userId, appointmentId, subject, partner, outcome, visitType, appointmentDate, visitTime, note)
 * Output: Created IVisit
 */
const storeVisit = async (req, res) => {
  const visit = req.body;

  if (!visit.userId) return res.status(400).json({ error: 'userId is required' });

  // Auto-generate appointmentId if not provided
  if (!visit.appointmentId) {
    visit.appointmentId = uuidv4();
  }

  try {
    const created = await createVisitReport(visit);
    res.status(201).json(created);
  } catch (err) {
    console.error('storeVisit error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /UpdateUserVisitReportByAppointmentId
 * Input:  IVisit (full object including userId + appointmentId)
 * Output: Updated IVisit
 */
const updateVisit = async (req, res) => {
  const visit = req.body;

  if (!visit.userId || !visit.appointmentId) {
    return res.status(400).json({ error: 'userId and appointmentId are required' });
  }

  try {
    const updated = await updateVisitReport(visit);
    res.json(updated);
  } catch (err) {
    console.error('updateVisit error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /DeleteUserVisitReportByAppointmentId/:appointmentId
 * Query param: userId (required since we use userId as partition key)
 */
const deleteVisit = async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.query.userId || req.body?.userId;

  if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required (query param)' });

  try {
    await deleteVisitReport(userId, appointmentId);
    res.status(204).send();
  } catch (err) {
    console.error('deleteVisit error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllVisits, storeVisit, updateVisit, deleteVisit };
