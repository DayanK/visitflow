const { saveRoute, getAllRoutes, deleteRoute } = require('../services/tableStorageService');

const getRoutes = async (req, res) => {
  const { userId } = req.params;
  try {
    const routes = await getAllRoutes(userId);
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const storeRoute = async (req, res) => {
  const { userId, name, startDate, endDate, visitCount, contactIds } = req.body;
  if (!userId || !contactIds) return res.status(400).json({ error: 'userId and contactIds are required' });
  try {
    const route = await saveRoute(userId, { name, startDate, endDate, visitCount, contactIds });
    res.json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeRoute = async (req, res) => {
  const { userId, routeId } = req.params;
  try {
    await deleteRoute(userId, routeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getRoutes, storeRoute, removeRoute };
