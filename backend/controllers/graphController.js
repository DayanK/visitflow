const axios = require('axios');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Extract Bearer token from Authorization header or request body.
function resolveToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return req.body?.token ?? null;
}

function graphClient(accessToken) {
  return axios.create({
    baseURL: GRAPH_BASE,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

const getAllContacts = async (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const client = graphClient(token);
    const response = await client.get('/me/contacts?$top=999');
    res.json(response.data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    console.error('getAllContacts error:', msg);
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getCalendarEvents = async (req, res) => {
  const token = resolveToken(req);
  const { calendarNameFromUserSetting } = req.body;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const client = graphClient(token);
    const { data: calendarsData } = await client.get('/me/calendars?$top=999');
    const calendars = calendarsData.value ?? [];

    const calendarId = calendars.find(
      (c) => c.name === calendarNameFromUserSetting?.Calendarname
    )?.id;

    if (calendarId) {
      const { data } = await client.get(
        `/me/calendars/${calendarId}/events?$select=subject,organizer,start,end,location&$top=999`
      );
      let events = data.value;
      let nextLink = data['@odata.nextLink'];
      while (nextLink) {
        const { data: page } = await axios.get(nextLink, {
          headers: { Authorization: `Bearer ${token}` },
        });
        events = events.concat(page.value);
        nextLink = page['@odata.nextLink'];
      }
      res.json(events);
    } else {
      const { data } = await client.get('/me/calendar/events?$top=999');
      res.json(data.value);
    }
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    console.error('getCalendarEvents error:', msg);
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getUserProfile = async (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data } = await graphClient(token).get('/me');
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    console.error('getUserProfile error:', msg);
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getGraphEntity = async (req, res) => {
  const token = resolveToken(req);
  const { api, query, filter } = req.body;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    let url = api + '?$top=999';
    if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
    else if (query) url += `&$search="${encodeURIComponent(query)}"`;
    const { data } = await graphClient(token).get(url);
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const postGraphEntity = async (req, res) => {
  const token = resolveToken(req);
  const { api, body } = req.body;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data } = await graphClient(token).post(api, body);
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const deleteGraphEntity = async (req, res) => {
  const token = resolveToken(req);
  const { api } = req.body;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    await graphClient(token).delete(api);
    res.json({ success: true });
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getUserCalendarData = async (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data } = await graphClient(token).get(
      '/me/events?$select=subject,organizer,attendees,start,end,location&$top=999'
    );
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getUserUsageRights = async (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data: me } = await graphClient(token).get('/me');
    const { data } = await axios.get(
      `${GRAPH_BASE}/users/${me.id}/usageRights`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

const getUserProfileOnBehalfOf = getUserProfile;

const getDynamicsEntity = async (req, res) => {
  const token = resolveToken(req);
  const { dynamicsUri, api } = req.query;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data } = await axios.get(`${dynamicsUri}/api/data/v9.1/${api}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(data);
  } catch (error) {
    const msg = error.response?.data?.error?.message ?? error.message;
    res.status(error.response?.status ?? 500).json({ error: msg });
  }
};

module.exports = {
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
};
