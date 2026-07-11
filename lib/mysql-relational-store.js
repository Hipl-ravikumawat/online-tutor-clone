const crypto = require('crypto');

module.exports = function createRelationalStore({ getPool, Schema, ObjectIdFactory, models, clone }) {
  const compiled = new Map();

  function identifier(value) {
    const clean = String(value).replace(/[^a-zA-Z0-9_]/g, '_');
    if (clean.length <= 60) return clean;
    return `${clean.slice(0, 51)}_${crypto.createHash('sha1').update(clean).digest('hex').slice(0, 8)}`;
  }
  const quote = value => `\`${identifier(value)}\``;
  const columnName = path => identifier(path.replace(/\./g, '__'));
  const isSchema = value => value instanceof Schema;
  const isObjectId = type => type === ObjectIdFactory || type === 'ObjectId';

  function typeOfSpec(spec) {
    if (isSchema(spec)) return { kind: 'object', definition: spec.definition };
    if (Array.isArray(spec)) return { kind: 'array', inner: spec[0] };
    if (spec && typeof spec === 'object' && Array.isArray(spec.type)) return { kind: 'array', inner: spec.type[0] };
    if (spec && typeof spec === 'object' && spec.type === Array) return { kind: 'array', inner: null };
    if (spec && typeof spec === 'object' && !spec.type) return { kind: 'object', definition: spec };
    const type = spec && typeof spec === 'object' ? spec.type : spec;
    if (isObjectId(type) || spec?.ref) return { kind: 'id' };
    if (type === String) return { kind: 'string' };
    if (type === Number || type?.name === 'Decimal128') return { kind: 'number' };
    if (type === Boolean) return { kind: 'boolean' };
    if (type === Date) return { kind: 'date' };
    return { kind: 'json' };
  }

  function sqlType(kind) {
    if (kind === 'id') return 'VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL';
    if (kind === 'number') return 'DOUBLE NULL';
    if (kind === 'boolean') return 'TINYINT(1) NULL';
    if (kind === 'date') return 'DATETIME(3) NULL';
    if (kind === 'string') return 'LONGTEXT NULL';
    return 'LONGTEXT NULL';
  }

  function compile(modelName, schema) {
    if (compiled.has(modelName)) return compiled.get(modelName);
    const columns = [];
    const relations = [];
    const buildRelation = (fullPath, relativePath, innerSpec, parent = null) => {
      const inner = typeOfSpec(innerSpec);
      const relation = {
        path: relativePath,
        fullPath,
        table: identifier(`${modelName}__${fullPath.replace(/\./g, '__')}`),
        primitive: !innerSpec || !['object', 'array'].includes(inner.kind),
        valueKind: !innerSpec ? 'json' : inner.kind,
        fields: [], children: [], parent,
      };
      if (inner.kind === 'object') {
        const collect = (definition, prefix = '') => {
          for (const [key, spec] of Object.entries(definition || {})) {
            const path = prefix ? `${prefix}.${key}` : key;
            const info = typeOfSpec(spec);
            if (info.kind === 'object') collect(info.definition, path);
            else if (info.kind === 'array') relation.children.push(buildRelation(`${fullPath}.${path}`, path, info.inner, relation));
            else relation.fields.push({ path, column: columnName(path), kind: info.kind });
          }
        };
        collect(inner.definition);
        if (!relation.fields.length && !relation.children.length) { relation.primitive = true; relation.valueKind = 'json'; }
      }
      return relation;
    };
    const walk = (definition, prefix = '') => {
      for (const [key, spec] of Object.entries(definition || {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        const info = typeOfSpec(spec);
        if (info.kind === 'object') walk(info.definition, path);
        else if (info.kind === 'array') {
          const inner = typeOfSpec(info.inner);
          relations.push(buildRelation(path, path, info.inner));
        } else columns.push({ path, column: columnName(path), kind: info.kind });
      }
    };
    walk(schema.definition);
    const timestamps = schema.options?.timestamps;
    if (timestamps) {
      const created = typeof timestamps === 'object' ? timestamps.createdAt || 'createdAt' : 'createdAt';
      const updated = typeof timestamps === 'object' ? timestamps.updatedAt || 'updatedAt' : 'updatedAt';
      if (!columns.some(x => x.path === created)) columns.push({ path: created, column: columnName(created), kind: 'date' });
      if (!columns.some(x => x.path === updated)) columns.push({ path: updated, column: columnName(updated), kind: 'date' });
    }
    const result = { modelName, table: identifier(modelName), columns, relations };
    compiled.set(modelName, result);
    return result;
  }

  function getPath(object, path) {
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
  }
  function setPath(object, path, value) {
    const parts = path.split('.'); let target = object;
    for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] ||= {};
    target[parts[parts.length - 1]] = value;
  }
  function serialize(value, kind) {
    if (value == null || value === '') return value === '' && kind === 'string' ? '' : null;
    if (kind === 'id') return String(value?._id || value);
    if (kind === 'boolean') return value ? 1 : 0;
    if (kind === 'number') return Number.isFinite(Number(value)) ? Number(value) : null;
    if (kind === 'date') { const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
    if (kind === 'json') return JSON.stringify(value);
    return String(value);
  }
  function deserialize(value, kind) {
    if (value == null) return value;
    if (kind === 'boolean') return Boolean(Number(value));
    if (kind === 'number') return Number(value);
    if (kind === 'date') return value instanceof Date ? value : new Date(value);
    if (kind === 'json') { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return value; } }
    return value;
  }

  function ddlFor(layout) {
    const statements = [];
    const everyRelation = roots => roots.flatMap(relation => [relation, ...everyRelation(relation.children || [])]);
    const mainColumns = layout.columns.map(field => `${quote(field.column)} ${sqlType(field.kind)}`);
    statements.push(`CREATE TABLE IF NOT EXISTS ${quote(layout.table)} (\n  \`_id\` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,${mainColumns.length ? `\n  ${mainColumns.join(',\n  ')},` : ''}\n  PRIMARY KEY (\`_id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    for (const relation of everyRelation(layout.relations)) {
      const valueColumns = relation.primitive
        ? [`\`value\` ${sqlType(relation.valueKind)}`]
        : relation.fields.map(field => `${quote(field.column)} ${sqlType(field.kind)}`);
      const constraints = [
        `CONSTRAINT ${quote(`fk_${relation.table}_root`)} FOREIGN KEY (\`parent_id\`) REFERENCES ${quote(layout.table)} (\`_id\`) ON DELETE CASCADE`,
      ];
      if (relation.parent) constraints.push(`CONSTRAINT ${quote(`fk_${relation.table}_parent`)} FOREIGN KEY (\`parent_row_id\`) REFERENCES ${quote(relation.parent.table)} (\`_row_id\`) ON DELETE CASCADE`);
      statements.push(`CREATE TABLE IF NOT EXISTS ${quote(relation.table)} (\n  \`_row_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n  \`parent_id\` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,\n  \`parent_row_id\` BIGINT UNSIGNED NULL,\n  \`item_id\` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,\n  \`position\` INT UNSIGNED NOT NULL DEFAULT 0,\n  ${valueColumns.join(',\n  ')},\n  PRIMARY KEY (\`_row_id\`),\n  INDEX \`idx_parent_position\` (\`parent_id\`, \`position\`),\n  INDEX \`idx_parent_row\` (\`parent_row_id\`, \`position\`),\n  ${constraints.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }
    return statements;
  }

  async function ensure(modelName, schema) {
    const pool = getPool();
    const layout = compile(modelName, schema);
    for (const sql of ddlFor(layout)) await pool.query(sql);
    const everyRelation = roots => roots.flatMap(relation => [relation, ...everyRelation(relation.children || [])]);
    for (const relation of everyRelation(layout.relations)) {
      const [columns] = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', [relation.table, 'parent_row_id']);
      if (!columns.length) await pool.query(`ALTER TABLE ${quote(relation.table)} ADD COLUMN \`parent_row_id\` BIGINT UNSIGNED NULL AFTER \`parent_id\`, ADD INDEX \`idx_parent_row\` (\`parent_row_id\`,\`position\`)`);
      const rootConstraint = identifier(`fk_${relation.table}_root`);
      const [rootKeys] = await pool.query('SELECT constraint_name FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?', [relation.table, rootConstraint]);
      if (!rootKeys.length) await pool.query(`ALTER TABLE ${quote(relation.table)} ADD CONSTRAINT ${quote(rootConstraint)} FOREIGN KEY (\`parent_id\`) REFERENCES ${quote(layout.table)} (\`_id\`) ON DELETE CASCADE`);
      if (relation.parent) {
        const parentConstraint = identifier(`fk_${relation.table}_parent`);
        const [parentKeys] = await pool.query('SELECT constraint_name FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?', [relation.table, parentConstraint]);
        if (!parentKeys.length) await pool.query(`ALTER TABLE ${quote(relation.table)} ADD CONSTRAINT ${quote(parentConstraint)} FOREIGN KEY (\`parent_row_id\`) REFERENCES ${quote(relation.parent.table)} (\`_row_id\`) ON DELETE CASCADE`);
      }
    }
    return layout;
  }

  async function save(modelName, schema, document, options = {}) {
    const pool = getPool();
    const layout = await ensure(modelName, schema);
    const connection = options.connection || await pool.getConnection();
    const ownsConnection = !options.connection;
    try {
      if (ownsConnection) await connection.beginTransaction();
      const names = ['_id', ...layout.columns.map(x => x.column)];
      const values = [String(document._id), ...layout.columns.map(field => serialize(getPath(document, field.path), field.kind))];
      const placeholders = names.map(() => '?').join(',');
      const updates = layout.columns.map(field => `${quote(field.column)}=VALUES(${quote(field.column)})`).join(',');
      await connection.query(`INSERT INTO ${quote(layout.table)} (${names.map(quote).join(',')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates || '`_id`=VALUES(`_id`)'}`, values);
      const everyRelation = roots => roots.flatMap(relation => [relation, ...everyRelation(relation.children || [])]);
      for (const relation of everyRelation(layout.relations)) await connection.query(`DELETE FROM ${quote(relation.table)} WHERE parent_id=?`, [String(document._id)]);
      const saveRelation = async (relation, items, parentRowId = null) => {
        if (!Array.isArray(items)) return;
        for (let position = 0; position < items.length; position++) {
          const item = items[position];
          let result;
          if (relation.primitive) {
            [result] = await connection.query(`INSERT INTO ${quote(relation.table)} (parent_id,parent_row_id,item_id,position,value) VALUES (?,?,?,?,?)`, [String(document._id), parentRowId, item?._id ? String(item._id) : null, position, serialize(item, relation.valueKind)]);
          } else {
            const names = ['parent_id', 'parent_row_id', 'item_id', 'position', ...relation.fields.map(x => x.column)];
            const values = [String(document._id), parentRowId, item?._id ? String(item._id) : null, position, ...relation.fields.map(field => serialize(getPath(item, field.path), field.kind))];
            [result] = await connection.query(`INSERT INTO ${quote(relation.table)} (${names.map(quote).join(',')}) VALUES (${names.map(() => '?').join(',')})`, values);
          }
          for (const child of relation.children || []) await saveRelation(child, getPath(item, child.path), result.insertId);
        }
      };
      for (const relation of layout.relations) await saveRelation(relation, getPath(document, relation.path));
      if (ownsConnection) await connection.commit();
    } catch (error) {
      if (ownsConnection) await connection.rollback();
      throw error;
    } finally {
      if (ownsConnection) connection.release();
    }
  }

  async function all(modelName, schema) {
    const pool = getPool();
    const layout = await ensure(modelName, schema);
    const [rows] = await pool.query(`SELECT * FROM ${quote(layout.table)}`);
    const documents = rows.map(row => {
      const document = { _id: row._id };
      for (const field of layout.columns) if (row[field.column] != null) setPath(document, field.path, deserialize(row[field.column], field.kind));
      for (const relation of layout.relations) setPath(document, relation.path, []);
      return document;
    });
    const byId = new Map(documents.map(document => [String(document._id), document]));
    const loadRelation = async (relation, ownerMap, rootLevel = false) => {
      const [items] = await pool.query(`SELECT * FROM ${quote(relation.table)} ORDER BY parent_id,position`);
      const childOwnerMap = new Map();
      for (const row of items) {
        const parent = rootLevel ? byId.get(String(row.parent_id)) : ownerMap.get(String(row.parent_row_id));
        if (!parent) continue;
        let value;
        if (relation.primitive) value = deserialize(row.value, relation.valueKind);
        else {
          value = {};
          if (row.item_id) value._id = row.item_id;
          for (const field of relation.fields) if (row[field.column] != null) setPath(value, field.path, deserialize(row[field.column], field.kind));
        }
        let destination = getPath(parent, relation.path);
        if (!Array.isArray(destination)) { setPath(parent, relation.path, []); destination = getPath(parent, relation.path); }
        destination.push(value);
        childOwnerMap.set(String(row._row_id), value);
      }
      for (const child of relation.children || []) await loadRelation(child, childOwnerMap, false);
    };
    for (const relation of layout.relations) await loadRelation(relation, byId, true);
    return documents;
  }

  async function remove(modelName, schema, id) {
    const pool = getPool();
    const layout = await ensure(modelName, schema);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const everyRelation = roots => roots.flatMap(relation => [relation, ...everyRelation(relation.children || [])]);
      for (const relation of everyRelation(layout.relations)) await connection.query(`DELETE FROM ${quote(relation.table)} WHERE parent_id=?`, [String(id)]);
      await connection.query(`DELETE FROM ${quote(layout.table)} WHERE _id=?`, [String(id)]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async function tableExists(name) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=? LIMIT 1', [name]);
    return rows.length > 0;
  }

  async function migrateLegacy({ dropLegacy = false, forceLegacy = false } = {}) {
    const pool = getPool();
    const report = [];
    for (const [name, Model] of models.entries()) {
      const legacy = identifier(`odm_${name}`);
      const layout = await ensure(name, Model.schema);
      if (!await tableExists(legacy)) { report.push({ model: name, migrated: 0, legacy: false }); continue; }
      const [[targetCount]] = await pool.query(`SELECT COUNT(*) count FROM ${quote(layout.table)}`);
      const [legacyRows] = await pool.query(`SELECT document FROM ${quote(legacy)}`);
      let migrated = 0;
      if (Number(targetCount.count) === 0 || forceLegacy) {
        for (const row of legacyRows) {
          const document = typeof row.document === 'string' ? JSON.parse(row.document) : row.document;
          await save(name, Model.schema, document);
          migrated++;
        }
      }
      const [[afterCount]] = await pool.query(`SELECT COUNT(*) count FROM ${quote(layout.table)}`);
      if (dropLegacy && Number(afterCount.count) >= legacyRows.length) await pool.query(`DROP TABLE ${quote(legacy)}`);
      report.push({ model: name, migrated, legacy: true, targetCount: Number(afterCount.count), sourceCount: legacyRows.length });
    }
    if (dropLegacy) {
      const [remaining] = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'odm\\_%'");
      for (const row of remaining) await pool.query(`DROP TABLE ${quote(row.table_name)}`);
    }
    return report;
  }

  function schemaSql() {
    const statements = [];
    for (const [name, Model] of models.entries()) statements.push(...ddlFor(compile(name, Model.schema)));
    return statements.map(sql => `${sql};`).join('\n\n');
  }

  return { compile, ensure, save, all, remove, migrateLegacy, schemaSql, identifier };
};
