const tables = {};

function get(name) {
  return tables[name]; // undefined until a table exists
}

module.exports = { get };
