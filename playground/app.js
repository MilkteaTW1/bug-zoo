// Bug #1: crashes because db.get() returns null. Fix it in lib/api.js or lib/db.js.
const api = require('./lib/api');

console.log('users:', api.listUsers());
