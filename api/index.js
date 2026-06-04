// Vercel serverless entry
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const app = require('../server/index');
module.exports = app;
