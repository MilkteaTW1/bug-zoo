const db = require('./db');

function listUsers() {
  return db.get('users').rows.map((r) => r.name);
}

module.exports = { listUsers };
