const { getContactNote, getAllContactNotes, upsertContactNote } = require('../services/tableStorageService');

const getNote = async (req, res) => {
  const { userId, contactId } = req.params;
  try {
    const note = await getContactNote(userId, contactId);
    res.json({ note: note ?? { contactId, content: '', updatedAt: '' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllNotes = async (req, res) => {
  const { userId } = req.params;
  try {
    const notes = await getAllContactNotes(userId);
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const storeNote = async (req, res) => {
  const { userId, contactId, content } = req.body;
  if (!userId || !contactId) return res.status(400).json({ error: 'userId and contactId are required' });
  try {
    await upsertContactNote(userId, contactId, content ?? '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNote, getAllNotes, storeNote };
