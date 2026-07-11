require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysqlOrm = require('mysql-orm');

for (const file of fs.readdirSync(path.join(__dirname, '..', 'models')).filter(file => file.endsWith('.js'))) {
  require(path.join(__dirname, '..', 'models', file));
}

async function main() {
  const dropLegacy = process.argv.includes('--drop-legacy');
  const forceLegacy = dropLegacy || process.argv.includes('--force-legacy');
  await mysqlOrm.connect();
  const report = await mysqlOrm.syncRelationalSchemas({ dropLegacy, forceLegacy });
  const header = `-- Generated from the application's 63 model schemas.\n-- Scalar and reference fields use typed columns; arrays and embedded records use child tables.\n\nCREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'online_tutor'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`${process.env.DB_NAME || 'online_tutor'}\`;\n\nCREATE TABLE IF NOT EXISTS \`user_sessions\` (\n  \`session_id\` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,\n  \`expires\` INT UNSIGNED NOT NULL,\n  \`data\` MEDIUMTEXT COLLATE utf8mb4_bin,\n  PRIMARY KEY (\`session_id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;\n\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), `${header}${mysqlOrm.relationalSchemaSql()}\n`, 'utf8');
  const migrated = report.reduce((sum, item) => sum + item.migrated, 0);
  console.log(`Relational schema synchronized for ${report.length} models; ${migrated} legacy record(s) migrated.`);
  if (dropLegacy) console.log('Verified legacy odm_* tables were removed.');
  await mysqlOrm.connection.close();
}

main().catch(async error => {
  console.error(error);
  await mysqlOrm.connection.close().catch(() => {});
  process.exitCode = 1;
});
