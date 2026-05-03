const { TableClient, TableServiceClient } = require('@azure/data-tables');
require('dotenv').config();

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const TABLE_NAMES = {
  USER_SETTINGS: 'UserSettings',
  COORDINATES: 'Coordinates',
  VISIT_REPORT: 'VisitReport',
  CONTACT_NOTES: 'ContactNotes',
};

function getTableClient(tableName) {
  return TableClient.fromConnectionString(CONNECTION_STRING, tableName);
}

async function initializeTables() {
  if (!CONNECTION_STRING) {
    console.warn('AZURE_STORAGE_CONNECTION_STRING not set — Table Storage disabled');
    return;
  }
  const serviceClient = TableServiceClient.fromConnectionString(CONNECTION_STRING);
  for (const tableName of Object.values(TABLE_NAMES)) {
    try {
      await serviceClient.createTable(tableName);
      console.log(`Table created or already exists: ${tableName}`);
    } catch (err) {
      if (err.statusCode !== 409) throw err; // 409 = already exists
    }
  }
}

// ─── User Settings ────────────────────────────────────────────────────────────

async function getAllUserSettings(username) {
  const client = getTableClient(TABLE_NAMES.USER_SETTINGS);
  const entities = client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${username}'` },
  });
  const result = [];
  for await (const entity of entities) {
    result.push({
      username: entity.partitionKey,
      dispSetting: entity.rowKey,
      settingsString: entity.SettingsString || '',
    });
  }
  return result;
}

async function upsertUserSettings(username, dispSetting, settingsString) {
  const client = getTableClient(TABLE_NAMES.USER_SETTINGS);
  await client.upsertEntity(
    { partitionKey: username, rowKey: dispSetting, SettingsString: settingsString },
    'Replace'
  );
}

async function deleteUserSettings(username, dispSetting) {
  const client = getTableClient(TABLE_NAMES.USER_SETTINGS);
  try {
    await client.deleteEntity(username, dispSetting);
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }
}

// ─── Coordinates Cache ─────────────────────────────────────────────────────────

function normalizeKey(value) {
  if (!value) return 'unknown';
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 200);
}

async function getCachedCoordinates(postalCode, street) {
  const client = getTableClient(TABLE_NAMES.COORDINATES);
  const partitionKey = normalizeKey(postalCode);
  const rowKey = normalizeKey(street);
  try {
    const entity = await client.getEntity(partitionKey, rowKey);
    return { latitude: entity.Latitude, longitude: entity.Longitude };
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

async function storeCoordinates(postalCode, street, latitude, longitude) {
  const client = getTableClient(TABLE_NAMES.COORDINATES);
  const partitionKey = normalizeKey(postalCode);
  const rowKey = normalizeKey(street);
  await client.upsertEntity(
    { partitionKey, rowKey, Latitude: latitude, Longitude: longitude },
    'Replace'
  );
}

// ─── Visit Reports ─────────────────────────────────────────────────────────────

function entityToVisit(entity) {
  return {
    userId: entity.UserId,
    appointmentId: entity.rowKey,
    subject: entity.Subject,
    partner: entity.Partner,
    outcome: entity.Outcome,
    visitType: entity.VisitType,
    appointmentDate: entity.AppointmentDate,
    visitTime: entity.VisitTime,
    note: entity.Note || '',
  };
}

async function getAllVisitReportsByUser(userId) {
  const client = getTableClient(TABLE_NAMES.VISIT_REPORT);
  // PartitionKey = userId so listing all for a user is a simple PK filter
  const entities = client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${userId}'` },
  });
  const result = [];
  for await (const entity of entities) {
    result.push(entityToVisit(entity));
  }
  return result;
}

async function createVisitReport(visit) {
  const client = getTableClient(TABLE_NAMES.VISIT_REPORT);
  await client.upsertEntity(
    {
      partitionKey: visit.userId,
      rowKey: visit.appointmentId,
      UserId: visit.userId,
      Subject: visit.subject,
      Partner: visit.partner,
      Outcome: visit.outcome,
      VisitType: visit.visitType,
      AppointmentDate: visit.appointmentDate,
      VisitTime: visit.visitTime,
      Note: visit.note || '',
    },
    'Replace'
  );
  return visit;
}

async function updateVisitReport(visit) {
  return createVisitReport(visit); // upsert handles both create and update
}

async function deleteVisitReport(userId, appointmentId) {
  const client = getTableClient(TABLE_NAMES.VISIT_REPORT);
  await client.deleteEntity(userId, appointmentId);
}

// ─── Contact Notes ─────────────────────────────────────────────────────────────

async function getContactNote(userId, contactId) {
  const client = getTableClient(TABLE_NAMES.CONTACT_NOTES);
  try {
    const entity = await client.getEntity(normalizeKey(userId), normalizeKey(contactId));
    return { contactId, content: entity.Content || '', updatedAt: entity.UpdatedAt || '' };
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

async function getAllContactNotes(userId) {
  const client = getTableClient(TABLE_NAMES.CONTACT_NOTES);
  const pk = normalizeKey(userId);
  const entities = client.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk}'` } });
  const result = [];
  for await (const entity of entities) {
    result.push({ contactId: entity.ContactId, content: entity.Content || '', updatedAt: entity.UpdatedAt || '' });
  }
  return result;
}

async function upsertContactNote(userId, contactId, content) {
  const client = getTableClient(TABLE_NAMES.CONTACT_NOTES);
  const pk = normalizeKey(userId);
  const rk = normalizeKey(contactId);
  if (!content || !content.trim()) {
    try { await client.deleteEntity(pk, rk); } catch (e) { if (e.statusCode !== 404) throw e; }
    return;
  }
  await client.upsertEntity(
    { partitionKey: pk, rowKey: rk, ContactId: contactId, Content: content, UpdatedAt: new Date().toISOString() },
    'Replace'
  );
}

module.exports = {
  initializeTables,
  getAllUserSettings,
  upsertUserSettings,
  deleteUserSettings,
  getCachedCoordinates,
  storeCoordinates,
  getAllVisitReportsByUser,
  createVisitReport,
  updateVisitReport,
  deleteVisitReport,
  getContactNote,
  getAllContactNotes,
  upsertContactNote,
};
