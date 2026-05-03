const msal = require('@azure/msal-node');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Configure via .env — see .env.example
PORT=8080


const msalClient = new msal.ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    clientSecret: CLIENT_SECRET,
  }
});

module.exports = msalClient;
