const {
  getAllUserSettings,
  upsertUserSettings,
  deleteUserSettings,
} = require('../services/tableStorageService');

/**
 * POST /GetAllUserSettings
 * Input:  { username, dispSetting, settingsString }  (only username used)
 * Output: { userSettings: [{ username, dispSetting, settingsString }] }
 */
const getAllSettings = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const userSettings = await getAllUserSettings(username);
    res.json({ userSettings });
  } catch (err) {
    console.error('getAllSettings error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /StoreUserSettings
 * Input:  { userSettings: [{ username, dispSetting, settingsString }] }
 * Output: 200 OK
 */
const storeSettings = async (req, res) => {
  const { userSettings } = req.body;

  if (!Array.isArray(userSettings)) {
    return res.status(400).json({ error: 'userSettings must be an array' });
  }

  try {
    for (const setting of userSettings) {
      const { username, dispSetting, settingsString } = setting;

      if (!username || !dispSetting) continue;

      // Delete entry if settingsString is empty (mirrors original C# behavior)
      if (settingsString === '' || settingsString == null) {
        await deleteUserSettings(username, dispSetting);
      } else {
        await upsertUserSettings(username, dispSetting, settingsString);
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('storeSettings error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllSettings, storeSettings };
