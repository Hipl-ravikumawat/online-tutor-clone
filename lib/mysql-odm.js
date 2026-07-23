/*
 * Application model/query facade backed exclusively by normalized MySQL tables.
 * Existing schemas/controllers stay intact while scalar fields become typed
 * columns and arrays/embedded records are stored in related child tables.
 */
const crypto = require('crypto');
const { EventEmitter } = require('events');
const mysql = require('mysql2/promise');

class ObjectId {
  constructor(value) {
    const id = value instanceof ObjectId ? value.value : value;
    this.value = id == null ? crypto.randomBytes(12).toString('hex') : String(id);
    if (!ObjectId.isValid(this.value)) throw new TypeError(`Invalid ObjectId: ${this.value}`);
  }
  toString() { return this.value; }
  valueOf() { return this.value; }
  toJSON() { return this.value; }
  equals(other) { return normalise(other) === this.value; }
  static isValid(value) { return /^[a-f\d]{24}$/i.test(normalise(value) || ''); }
}

function ObjectIdFactory(value) { return new ObjectId(value); }
ObjectIdFactory.prototype = ObjectId.prototype;
ObjectIdFactory.isValid = ObjectId.isValid;

class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = options;
    this._pres = {};
    this._virtuals = {};
    this.statics = {};
    this.methods = {};
  }
  pre(names, fn) { for (const n of Array.isArray(names) ? names : [names]) (this._pres[n] ||= []).push(fn); return this; }
  post() { return this; }
  index() { return this; }
  plugin(fn, opts) { if (typeof fn === 'function') fn(this, opts); return this; }
  virtual(name, options) { this._virtuals[name] = options || {}; return { get: () => this, set: () => this }; }
  set(key, value) { this.options[key] = value; return this; }
}
Schema.Types = { ObjectId: ObjectIdFactory, Mixed: class Mixed {}, Decimal128: Number };

const emitter = new EventEmitter();
const models = new Map();
let pool;
let ready;
const relational = require('./mysql-relational-store')({
  getPool: () => pool, Schema, ObjectIdFactory, models, clone: value => clone(value),
});

function dbOptions() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'online_tutor',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    charset: 'utf8mb4',
    dateStrings: false,
  };
}

async function connect() {
  if (ready) return ready;
  ready = (async () => {
    pool = mysql.createPool(dbOptions());
    await pool.query('SELECT 1');
    emitter.emit('open');
    console.log('connected to database :: MySQL');
    return connection;
  })().catch(err => { emitter.emit('error', err); ready = null; throw err; });
  return ready;
}

function tableName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error(`Unsafe model name: ${name}`);
  return relational.identifier(name);
}

async function ensureTable(name) {
  await connect();
  const Model = models.get(name);
  if (!Model) throw new Error(`Model is not registered: ${name}`);
  await relational.ensure(name, Model.schema);
}

function clone(value) {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value === 'object') {
    if (typeof value.toJSON === 'function') return clone(value.toJSON());
    const out = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out;
  }
  return value;
}
function normalise(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value && typeof value === 'object' && value._id != null) return normalise(value._id);
  return value == null ? value : String(value);
}
function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (ObjectId.isValid(value)) return normalise(value);
  return value;
}
function valuesAt(obj, path) {
  const parts = path.split('.');
  let values = [obj];
  for (const part of parts) {
    values = values.flatMap(v => Array.isArray(v) ? v.flatMap(x => x == null ? [] : [x[part]]) : (v == null ? [] : [v[part]])).flat();
  }
  return values.length ? values : [undefined];
}
function equal(a, b) {
  if (Array.isArray(a)) return a.some(x => equal(x, b));
  if (Array.isArray(b)) return b.some(x => equal(a, x));
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  if (ObjectId.isValid(a) || ObjectId.isValid(b)) return normalise(a) === normalise(b);
  return a === b || (a != null && b != null && String(a) === String(b));
}
function conditionMatches(value, condition) {
  if (condition instanceof RegExp) return condition.test(String(value ?? ''));
  if (!condition || typeof condition !== 'object' || condition instanceof Date || condition instanceof ObjectId || Array.isArray(condition)) return equal(value, condition);
  return Object.entries(condition).every(([op, expected]) => {
    const vals = Array.isArray(value) ? value : [value];
    if (op === '$in') return expected.some(x => vals.some(v => equal(v, x) || conditionMatches(v, x)));
    if (op === '$nin') return !expected.some(x => vals.some(v => equal(v, x) || conditionMatches(v, x)));
    if (op === '$ne') return !vals.some(v => equal(v, expected));
    if (op === '$eq') return vals.some(v => equal(v, expected));
    if (op === '$exists') return expected ? value !== undefined : value === undefined;
    if (op === '$regex') { const r = expected instanceof RegExp ? expected : new RegExp(expected, condition.$options || ''); return vals.some(v => r.test(String(v ?? ''))); }
    if (op === '$options') return true;
    if (op === '$size') return Array.isArray(value) && value.length === expected;
    if (op === '$elemMatch') return Array.isArray(value) && value.some(v => matches(v, expected));
    if (op === '$not') return !conditionMatches(value, expected);
    if (op === '$gte') return vals.some(v => comparable(v) >= comparable(expected));
    if (op === '$gt') return vals.some(v => comparable(v) > comparable(expected));
    if (op === '$lte') return vals.some(v => comparable(v) <= comparable(expected));
    if (op === '$lt') return vals.some(v => comparable(v) < comparable(expected));
    return true;
  });
}
function matches(doc, filter = {}, vars = {}) {
  if (!filter || !Object.keys(filter).length) return true;
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some(x => matches(doc, x, vars));
    if (key === '$and') return condition.every(x => matches(doc, x, vars));
    if (key === '$nor') return !condition.some(x => matches(doc, x, vars));
    if (key === '$expr') return Boolean(expression(doc, condition, vars));
    return valuesAt(doc, key).some(value => conditionMatches(value, condition));
  });
}
function getPath(obj, path) {
  const parts=path.split('.');
  const walk=(value,index)=>{
    if(index>=parts.length)return value;
    if(Array.isArray(value) && !/^\d+$/.test(parts[index])) return value.map(x=>walk(x,index)).flat().filter(x=>x!==undefined);
    return value==null?undefined:walk(value[parts[index]],index+1);
  };
  return walk(obj,0);
}
function setPath(obj, path, value) {
  const parts = path.split('.'); let target = obj;
  for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] ||= {};
  target[parts.at(-1)] = value;
}
function unsetPath(obj, path) { const p = path.split('.'); const k = p.pop(); const t = p.reduce((v, x) => v?.[x], obj); if (t) delete t[k]; }
function applyUpdate(doc, update) {
  if (!update || !Object.keys(update).some(k => k.startsWith('$'))) Object.assign(doc, clone(update));
  for (const [op, values] of Object.entries(update || {})) {
    if (op === '$set') for (const [k, v] of Object.entries(values)) setPath(doc, k, clone(v));
    if (op === '$unset') for (const k of Object.keys(values)) unsetPath(doc, k);
    if (op === '$inc') for (const [k, v] of Object.entries(values)) setPath(doc, k, Number(getPath(doc, k) || 0) + Number(v));
    if (op === '$push') for (const [k, v] of Object.entries(values)) { const a = getPath(doc, k) || []; const items = v?.$each || [v]; a.push(...clone(items)); setPath(doc, k, a); }
    if (op === '$addToSet') for (const [k, v] of Object.entries(values)) { const a = getPath(doc, k) || []; for (const x of v?.$each || [v]) if (!a.some(y => equal(x, y))) a.push(clone(x)); setPath(doc, k, a); }
    if (op === '$pull') for (const [k, v] of Object.entries(values)) setPath(doc, k, (getPath(doc, k) || []).filter(x => !conditionMatches(x, v) && !matches(x, v)));
    if (op === '$pop') for (const [k, v] of Object.entries(values)) { const a = getPath(doc, k) || []; v < 0 ? a.shift() : a.pop(); }
  }
  return doc;
}

function defaultsFrom(definition) {
  const out = {};
  for (const [key, spec] of Object.entries(definition || {})) {
    if (Array.isArray(spec)) { out[key] = []; continue; }
    if (spec instanceof Schema) { out[key] = defaultsFrom(spec.definition); continue; }
    if (spec && typeof spec === 'object' && Object.prototype.hasOwnProperty.call(spec, 'default')) out[key] = typeof spec.default === 'function' ? spec.default() : clone(spec.default);
    else if (spec && typeof spec === 'object' && !spec.type) { const nested = defaultsFrom(spec); if (Object.keys(nested).length) out[key] = nested; }
  }
  return out;
}
function castObjectIds(data, definition) {
  if (!data || !definition) return data;
  for (const [key, spec] of Object.entries(definition)) {
    const value = data[key]; if (value == null) continue;
    if (Array.isArray(spec)) {
      const inner = spec[0];
      if (inner?.type === ObjectIdFactory || inner?.type === 'ObjectId' || inner === ObjectIdFactory || inner === 'ObjectId' || inner?.ref) data[key] = (Array.isArray(value)?value:[value]).map(x=>ObjectId.isValid(x)?new ObjectId(x):x);
      else if (inner instanceof Schema) data[key] = value.map(x=>castObjectIds(x,inner.definition));
      else if (inner && typeof inner === 'object' && !inner.type) data[key] = value.map(x=>castObjectIds(x,inner));
    } else if (spec?.type === ObjectIdFactory || spec?.type === 'ObjectId' || spec === ObjectIdFactory || spec === 'ObjectId' || spec?.ref) data[key] = ObjectId.isValid(value)?new ObjectId(value):value;
    else if (spec instanceof Schema) castObjectIds(value,spec.definition);
    else if (spec && typeof spec === 'object' && !spec.type) castObjectIds(value,spec);
  }
  return data;
}
async function runHooks(schema, name, context) {
  for (const fn of schema._pres[name] || []) await new Promise((resolve, reject) => { let done = false; const next = e => { done = true; e ? reject(e) : resolve(); }; const r = fn.call(context, next); if (r?.then) r.then(() => !done && resolve(), reject); else if (fn.length === 0) resolve(); });
}

class Document {
  constructor(model, data = {}, isNew = true) {
    Object.defineProperties(this, { _model: { value: model, writable: true }, isNew: { value: isNew, writable: true, enumerable: false } });
    Object.assign(this, defaultsFrom(model.schema.definition), castObjectIds(clone(data), model.schema.definition));
    this._id = normalise(this._id || new ObjectId());
    this.id = this._id;
    for (const [name, fn] of Object.entries(model.schema.methods)) if (!this[name]) Object.defineProperty(this, name, { value: fn.bind(this) });
  }
  async save() { await runHooks(this._model.schema, 'save', this); await this._model._save(this); this.isNew = false; return this; }
  isModified() { return true; }
  get(path) { return getPath(this, path); }
  set(path, value) { if (typeof path === 'object') Object.assign(this, path); else setPath(this, path, value); return this; }
  toObject() { const o = {}; for (const [k, v] of Object.entries(this)) if (!k.startsWith('_model') && k !== 'id') o[k] = clone(v); o._id = this._id; return o; }
  toJSON() { return this.toObject(); }
  equals(other) { return equal(this._id, other); }
  async populate(path, select) { await populateDocs([this], [{ path, select }], this._model); return this; }
}

class Query {
  constructor(model, operation, filter = {}, payload) { this.model = model; this.operation = operation; this.filter = filter || {}; this.payload = payload; this.options = {}; this.populates = []; }
  sort(v) { this.options.sort = v; return this; } skip(v) { this.options.skip = Number(v); return this; } limit(v) { this.options.limit = Number(v); return this; }
  select(v) { this.options.select = v; return this; } lean(v = true) { this.options.lean = v; return this; }
  populate(path, select, model, match) { this.populates.push(typeof path === 'object' ? path : { path, select, model, match }); return this; }
  collation() { return this; } hint() { return this; } session() { return this; }
  setOptions(v) { Object.assign(this.options, v); return this; }
  where(path, value) { if (typeof path === 'object') Object.assign(this.filter, path); else { this._wherePath=path; if (arguments.length > 1) this.filter[path] = value; } return this; }
  equals(value) { if (!this._wherePath) throw new Error('equals() requires where(path)'); this.filter[this._wherePath]=value; return this; }
  getQuery() { return this.filter; }
  getFilter() { return this.filter; }
  getUpdate() { return this.payload || {}; }
  setUpdate(value) { this.payload = value; return this; }
  clone() { const q = new Query(this.model, this.operation, clone(this.filter), clone(this.payload)); q.options = clone(this.options); q.populates = clone(this.populates); return q; }
  count() { this.operation = 'count'; return this; } countDocuments() { return this.count(); }
  then(resolve, reject) { return this.exec().then(resolve, reject); } catch(reject) { return this.exec().catch(reject); } finally(fn) { return this.exec().finally(fn); }
  async exec() {
    await ensureTable(this.model.modelName);
    const hookName = ({ findById: 'findOne', findByIdAndUpdate: 'findOneAndUpdate' })[this.operation] || this.operation;
    await runHooks(this.model.schema, hookName, this);
    let docs = await this.model._all();
    docs = docs.filter(d => matches(d, this.filter));
    if (this.options.sort) { const entries = typeof this.options.sort === 'string' ? this.options.sort.split(/\s+/).map(x => [x.replace(/^-/, ''), x.startsWith('-') ? -1 : 1]) : Object.entries(this.options.sort); docs.sort((a,b) => { for (const [k, rawDir] of entries) { const dir = String(rawDir).toLowerCase() === 'desc' || Number(rawDir) < 0 ? -1 : 1; const av=getPath(a,k), bv=getPath(b,k); if(av < bv)return -dir;if(av > bv)return dir; } return 0; }); }
    if (this.options.skip) docs = docs.slice(this.options.skip);
    if (this.options.limit != null && this.options.limit > 0) docs = docs.slice(0, this.options.limit);
    if (this.operation === 'count') return docs.length;
    if (this.operation === 'exists') return docs[0] ? { _id: docs[0]._id } : null;
    if (this.operation === 'deleteMany' || this.operation === 'deleteOne' || this.operation === 'findOneAndDelete') {
      const chosen = this.operation === 'deleteOne' || this.operation === 'findOneAndDelete' ? docs.slice(0,1) : docs;
      for (const d of chosen) await relational.remove(this.model.modelName, this.model.schema, d._id);
      return this.operation === 'findOneAndDelete' ? (chosen[0] || null) : { acknowledged: true, deletedCount: chosen.length };
    }
    if (['updateOne','updateMany','findOneAndUpdate','findByIdAndUpdate'].includes(this.operation)) {
      let chosen = ['updateOne','findOneAndUpdate','findByIdAndUpdate'].includes(this.operation) ? docs.slice(0,1) : docs;
      if (!chosen.length && this.options.upsert) chosen = [new this.model({ ...this.filter, ...this.payload })];
      for (const d of chosen) { applyUpdate(d, this.payload); await this.model._save(d); }
      if (this.operation.includes('find')) return this.options.new || this.options.returnDocument === 'after' ? chosen[0] || null : docs[0] || null;
      return { acknowledged: true, matchedCount: docs.length, modifiedCount: chosen.length, upsertedCount: docs.length ? 0 : chosen.length };
    }
    let result = this.operation === 'findOne' || this.operation === 'findById' ? docs[0] || null : docs;
    const list = result ? (Array.isArray(result) ? result : [result]) : [];
    if (this.populates.length) await populateDocs(list, this.populates, this.model);
    if (this.options.select) for (const d of list) projectDocument(d, this.options.select);
    if (this.options.lean) result = Array.isArray(result) ? result.map(d => d.toObject()) : result?.toObject();
    return result;
  }
}

function projectDocument(doc, select) {
  const fields = typeof select === 'string' ? select.split(/[\s,]+/).filter(Boolean) : Object.keys(select || {});
  const excludes = fields.filter(x => x.startsWith('-') || select?.[x] === 0).map(x => x.replace(/^-/, ''));
  if (excludes.length) for (const x of excludes) unsetPath(doc, x);
  else if (fields.length) for (const k of Object.keys(doc)) if (!fields.includes(k) && k !== '_id' && k !== 'id' && !k.startsWith('_')) delete doc[k];
}
function findRef(definition, path) {
  let node = definition;
  for (const part of path.split('.')) { if (Array.isArray(node)) node = node[0]; if (node instanceof Schema) node = node.definition; node = node?.[part]; }
  if (Array.isArray(node)) node = node[0];
  return node?.ref || node?.type?.ref;
}
async function populateDocs(docs, specs, sourceModel) {
  for (const spec of specs) {
    if (!spec?.path) continue;
    const modelName = spec.model?.modelName || spec.model || findRef(sourceModel.schema.definition, spec.path) || sourceModel.schema._virtuals[spec.path]?.ref;
    const target = models.get(modelName); if (!target) continue;
    for (const doc of docs) {
      const ids = getPath(doc, spec.path); if (ids == null) continue;
      let populated;
      if (sourceModel.schema._virtuals[spec.path]) { const v=sourceModel.schema._virtuals[spec.path]; populated = await target.find({ [v.foreignField]: getPath(doc, v.localField), ...(spec.match||{}) }); if (v.justOne) populated=populated[0]||null; }
      else if (Array.isArray(ids)) populated = await target.find({ _id: { $in: ids }, ...(spec.match||{}) });
      else populated = await target.findOne({ _id: ids, ...(spec.match||{}) });
      if (spec.select) for (const d of Array.isArray(populated) ? populated : [populated]) if (d) projectDocument(d, spec.select);
      setPath(doc, spec.path, populated);
      if (spec.populate && populated) await populateDocs(Array.isArray(populated) ? populated : [populated], Array.isArray(spec.populate) ? spec.populate : [spec.populate], target);
    }
  }
}

function expression(doc, expr, vars = {}) {
  if (expr === '$$ROOT' || expr === '$$CURRENT') return doc;
  if (typeof expr === 'string' && expr.startsWith('$$')) { const [name,...rest]=expr.slice(2).split('.'); const value=vars[name]; return rest.length?getPath(value,rest.join('.')):value; }
  if (typeof expr === 'string' && expr.startsWith('$')) return getPath(doc, expr.slice(1));
  if (Array.isArray(expr)) return expr.map(x => expression(doc, x, vars));
  if (!expr || typeof expr !== 'object') return expr;
  if ('$literal' in expr) return expr.$literal;
  if ('$ifNull' in expr) { const [a,b]=expr.$ifNull.map(x=>expression(doc,x,vars)); return a ?? b; }
  if ('$toString' in expr) return String(expression(doc, expr.$toString, vars));
  if ('$toLower' in expr) return String(expression(doc, expr.$toLower, vars) ?? '').toLowerCase();
  if ('$toUpper' in expr) return String(expression(doc, expr.$toUpper, vars) ?? '').toUpperCase();
  if ('$size' in expr) return (expression(doc, expr.$size, vars) || []).length;
  if ('$sum' in expr) return (expression(doc, expr.$sum, vars) || []).reduce((a,b)=>a+Number(b||0),0);
  if ('$add' in expr) return expr.$add.reduce((a,b)=>a+Number(expression(doc,b,vars)||0),0);
  if ('$multiply' in expr) return expr.$multiply.reduce((a,b)=>a*Number(expression(doc,b,vars)||0),1);
  if ('$isArray' in expr) return Array.isArray(expression(doc, expr.$isArray, vars));
  if ('$strLenCP' in expr) return [...String(expression(doc, expr.$strLenCP, vars) ?? '')].length;
  if ('$toDouble' in expr) return Number(expression(doc, expr.$toDouble, vars) || 0);
  if ('$concat' in expr) return expr.$concat.map(x=>expression(doc,x,vars) ?? '').join('');
  if ('$arrayElemAt' in expr) { const a=expression(doc,expr.$arrayElemAt[0],vars)||[]; let i=Number(expression(doc,expr.$arrayElemAt[1],vars));if(i<0)i=a.length+i;return a[i]; }
  if ('$cond' in expr) { const c=Array.isArray(expr.$cond)?expr.$cond:[expr.$cond.if,expr.$cond.then,expr.$cond.else]; return expression(doc,c[expression(doc,c[0],vars)?1:2],vars); }
  if ('$eq' in expr) return equal(expression(doc,expr.$eq[0],vars),expression(doc,expr.$eq[1],vars));
  if ('$ne' in expr) return !equal(expression(doc,expr.$ne[0],vars),expression(doc,expr.$ne[1],vars));
  for (const op of ['$gt','$gte','$lt','$lte']) if (op in expr) { const [a,b]=expr[op].map(x=>comparable(expression(doc,x,vars))); return op==='$gt'?a>b:op==='$gte'?a>=b:op==='$lt'?a<b:a<=b; }
  if ('$in' in expr) { const [a,b]=expr.$in.map(x=>expression(doc,x,vars));return (b||[]).some(x=>equal(a,x)); }
  if ('$and' in expr) return expr.$and.every(x=>Boolean(expression(doc,x,vars)));
  if ('$or' in expr) return expr.$or.some(x=>Boolean(expression(doc,x,vars)));
  if ('$not' in expr) return !expression(doc,expr.$not,vars);
  if ('$regexMatch' in expr) { const r=expr.$regexMatch;return new RegExp(expression(doc,r.regex,vars),r.options||'').test(String(expression(doc,r.input,vars)||'')); }
  if ('$map' in expr) { const m=expr.$map;return (expression(doc,m.input,vars)||[]).map(x=>expression(doc,m.in,{...vars,[m.as||'this']:x})); }
  if ('$filter' in expr) { const f=expr.$filter;return (expression(doc,f.input,vars)||[]).filter(x=>expression(doc,f.cond,{...vars,[f.as||'this']:x})); }
  if ('$reduce' in expr) { const r=expr.$reduce;return (expression(doc,r.input,vars)||[]).reduce((acc,x)=>expression(doc,r.in,{...vars,value:acc,this:x}),expression(doc,r.initialValue,vars)); }
  if ('$switch' in expr) { for(const b of expr.$switch.branches||[])if(expression(doc,b.case,vars))return expression(doc,b.then,vars);return expression(doc,expr.$switch.default,vars); }
  const out={}; for(const [k,v] of Object.entries(expr)) out[k]=expression(doc,v,vars); return out;
}
async function aggregate(model, pipeline = []) {
  let docs = (await model._all()).map(d => d.toObject());
  for (const stage of pipeline) {
    const [op, arg] = Object.entries(stage)[0];
    if (op === '$match') docs = docs.filter(d => matches(d,arg));
    else if (op === '$sort') docs.sort((a,b)=>{for(const[k,v]of Object.entries(arg)){if(getPath(a,k)<getPath(b,k))return-v;if(getPath(a,k)>getPath(b,k))return v;}return 0;});
    else if (op === '$skip') docs=docs.slice(arg); else if(op==='$limit')docs=docs.slice(0,arg);
    else if (op === '$project' || op === '$addFields' || op === '$set') docs=docs.map(d=>{const n=op==='$project'?{}:{...d};for(const[k,v]of Object.entries(arg)){if(v===1)n[k]=getPath(d,k);else if(v!==0)n[k]=expression(d,v);}return n;});
    else if (op === '$unset') docs=docs.map(d=>{for(const k of Array.isArray(arg)?arg:[arg])unsetPath(d,k);return d;});
    else if (op === '$unwind') { const path=(typeof arg==='string'?arg:arg.path).replace(/^\$/,''); const preserve=Boolean(arg?.preserveNullAndEmptyArrays); docs=docs.flatMap(d=>{const a=getPath(d,path);if(Array.isArray(a)){if(!a.length){if(!preserve)return[];const n=clone(d);setPath(n,path,null);return[n];}return a.map(x=>{const n=clone(d);setPath(n,path,x);return n;});}if(a==null)return preserve?[d]:[];return[d];}); }
    else if (op === '$lookup') {
      const target=models.get(arg.from) || models.get(arg.from.replace(/s$/, '')) || models.get(arg.from.replace(/ies$/, 'y')) || models.get(`${arg.from}s`); if(!target)continue; const foreign=(await target._all()).map(x=>x.toObject());
      docs=docs.map(d=>{
        let joined;
        if(arg.pipeline){
          const vars=Object.fromEntries(Object.entries(arg.let||{}).map(([k,v])=>[k,expression(d,v)]));
          joined=arg.localField && arg.foreignField
            ? foreign.filter(f=>equal(getPath(f,arg.foreignField),getPath(d,arg.localField)))
            : foreign.slice();
          joined=joined.filter(f=>arg.pipeline.every(stage=>!stage.$match||matches(f,stage.$match,vars)));
          for(const stage of arg.pipeline){
            if(stage.$sort)joined.sort((a,b)=>{for(const[k,v]of Object.entries(stage.$sort)){if(getPath(a,k)<getPath(b,k))return-v;if(getPath(a,k)>getPath(b,k))return v;}return 0;});
            if(stage.$limit)joined=joined.slice(0,stage.$limit);
            if(stage.$project)joined=joined.map(x=>{const o={};for(const[k,v]of Object.entries(stage.$project))if(v===1)o[k]=getPath(x,k);else if(v!==0)o[k]=expression(x,v,vars);return o;});
          }
        } else joined=foreign.filter(f=>equal(getPath(f,arg.foreignField),getPath(d,arg.localField)));
        return {...d,[arg.as]:joined};
      });
    }
    else if (op === '$count') docs=[{[arg]:docs.length}];
    else if (op === '$group') { const groups=new Map();for(const d of docs){const id=expression(d,arg._id);const key=JSON.stringify(id);if(!groups.has(key))groups.set(key,{_id:id,_docs:[]});groups.get(key)._docs.push(d);}docs=[...groups.values()].map(g=>{const o={_id:g._id};for(const[k,v]of Object.entries(arg)){if(k==='_id')continue;if(v.$sum!==undefined)o[k]=g._docs.reduce((s,d)=>s+Number(v.$sum===1?1:expression(d,v.$sum)||0),0);else if(v.$first!==undefined)o[k]=expression(g._docs[0],v.$first);else if(v.$push!==undefined)o[k]=g._docs.map(d=>expression(d,v.$push));else if(v.$addToSet!==undefined)o[k]=[...new Map(g._docs.map(d=>{const x=expression(d,v.$addToSet);return[JSON.stringify(x),x]})).values()];}return o;}); }
  }
  return docs;
}

function makeModel(name, schema) {
  const withCallback = (query, callback) => {
    if (typeof callback === 'function') query.exec().then(value => callback(null, value), callback);
    return query;
  };
  class Model extends Document {
    constructor(data) { super(Model, data, true); }
    static find(f={}, projection, options, cb) { const q=new Query(Model,'find',f); if(projection && typeof projection !== 'function')q.options.select=projection;if(options && typeof options !== 'function')Object.assign(q.options,options);return withCallback(q, typeof projection==='function'?projection:typeof options==='function'?options:cb); }
    static findOne(f={}, projection, options, cb) { const q=new Query(Model,'findOne',f);if(projection && typeof projection !== 'function')q.options.select=projection;if(options && typeof options !== 'function')Object.assign(q.options,options);return withCallback(q,typeof projection==='function'?projection:typeof options==='function'?options:cb); }
    static findById(id, projection, options, cb) { const q=new Query(Model,'findById',{_id:id});if(projection && typeof projection !== 'function')q.options.select=projection;if(options && typeof options !== 'function')Object.assign(q.options,options);return withCallback(q,typeof projection==='function'?projection:typeof options==='function'?options:cb); }
    static count(f={}, cb) { return withCallback(new Query(Model,'count',f), cb); } static countDocuments(f={}, cb) { return withCallback(new Query(Model,'count',f), cb); }
    static exists(f={}) { return new Query(Model,'exists',f); }
    static updateOne(f,u,o={}) { const q=new Query(Model,'updateOne',f,u);q.options=o;return q; } static updateMany(f,u,o={}) { const q=new Query(Model,'updateMany',f,u);q.options=o;return q; }
    static findOneAndUpdate(f,u,o={}) { const q=new Query(Model,'findOneAndUpdate',f,u);q.options=o;return q; } static findByIdAndUpdate(id,u,o={}) { const q=new Query(Model,'findByIdAndUpdate',{_id:id},u);q.options=o;return q; }
    static deleteOne(f={}) { return new Query(Model,'deleteOne',f); } static deleteMany(f={}) { return new Query(Model,'deleteMany',f); }
    static findOneAndDelete(f={}) { return new Query(Model,'findOneAndDelete',f); } static findByIdAndDelete(id) { return new Query(Model,'findOneAndDelete',{_id:id}); }
    static async create(value) { if(Array.isArray(value))return Promise.all(value.map(x=>Model.create(x)));const d=new Model(value);return d.save(); }
    static async insertMany(values) { return Promise.all(values.map(v=>Model.create(v))); }
    static aggregate(p=[]) { const promise=aggregate(Model,p); promise.exec=()=>promise; return promise; }
    static async distinct(path,f={}) { const d=await Model.find(f);return[...new Map(d.flatMap(x=>valuesAt(x,path)).map(x=>[JSON.stringify(x),x])).values()]; }
    static async bulkWrite(ops=[]) { for(const op of ops){if(op.updateOne)await Model.updateOne(op.updateOne.filter,op.updateOne.update,op.updateOne);else if(op.insertOne)await Model.create(op.insertOne.document);else if(op.deleteOne)await Model.deleteOne(op.deleteOne.filter);}return{ok:1}; }
    static async _all() { await ensureTable(name); const rows=await relational.all(name,schema); return rows.map(r=>new Model(r)).map(d=>{d.isNew=false;return d;}); }
    static async _save(doc) { await ensureTable(name); const now=new Date(); if(schema.options?.timestamps){const t=schema.options.timestamps;doc[t.createdAt||'createdAt'] ||= now;doc[t.updatedAt||'updatedAt']=now;}await relational.save(name,schema,doc.toObject());return doc; }
  }
  Model.modelName=name; Model.collection={name}; Model.schema=schema;
  Object.assign(Model,schema.statics);
  return Model;
}
function model(name, schema) { if(!schema)return models.get(name);if(models.has(name))return models.get(name);const m=makeModel(name,schema);models.set(name,m);return m; }

const connection = Object.assign(emitter, { getClient: () => pool, close: async () => pool?.end(), asPromise: connect });
async function syncRelationalSchemas(options) { await connect(); return relational.migrateLegacy(options); }
function relationalSchemaSql() { return relational.schemaSql(); }
module.exports = { Schema, model, models: Object.fromEntries(models), Types: { ObjectId: ObjectIdFactory }, connect, connection, set() {}, isValidObjectId: ObjectId.isValid, syncRelationalSchemas, relationalSchemaSql };
