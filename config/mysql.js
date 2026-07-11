const mysqlOrm = require('mysql-orm');

mysqlOrm.connect().catch((error) => {
  console.error('Error connecting to MySQL:', error.message);
});

module.exports = mysqlOrm.connection;
