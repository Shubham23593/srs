/**
 * In-process persistence layer (fallback when MongoDB is unavailable).
 *
 * Implements the small subset of the Mongoose Model API that this
 * application actually uses (find, findOne, findById, create, updateMany,
 * countDocuments, findByIdAndUpdate, findOneAndUpdate, deleteMany,
 * findByIdAndDelete, sort, lean, populate).
 *
 * When a real MongoDB connection is present, Mongoose models are used
 * unchanged. This shim is ONLY activated after the MongoDB connection
 * attempt fails (see src/config/db.js).
 *
 * Documents are stored as plain objects with generated ObjectId-like ids.
 */

const crypto = require('crypto');

const collections = new Map(); // modelName -> array of docs
const __registry = new Map();  // modelName -> Model

function objectId() {
  return new ObjectId();
}

class ObjectId {
  constructor(value) {
    if (value instanceof ObjectId) return value;
    if (typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)) {
      this.value = value;
    } else {
      // 12-byte hex (24 chars), prefixed with time-ish
      this.value = crypto.randomBytes(12).toString('hex');
    }
  }
  toString() {
    return this.value;
  }
  toJSON() {
    return this.value;
  }
  equals(other) {
    return String(other) === this.value;
  }
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  if (obj instanceof ObjectId) return new ObjectId(obj.value);
  if (obj instanceof Date) return new Date(obj.getTime());
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = deepClone(v);
  }
  return out;
}

function idsEqual(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

/**
 * A very small query matcher supporting:
 *  - equality { field: value }
 *  - $in / $ne / $gte / $lte / $gt / $lt / $exists
 *  - nested fields via dot notation
 */
function getNested(doc, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), doc);
}

function matchValue(docValue, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) && !(cond instanceof ObjectId)) {
    if ('$in' in cond) return cond.$in.some((v) => String(v) === String(docValue));
    if ('$ne' in cond) return String(docValue) !== String(cond.$ne);
    if ('$nin' in cond) return !cond.$nin.some((v) => String(v) === String(docValue));
    if ('$gte' in cond) return docValue >= cond.$gte;
    if ('$lte' in cond) return docValue <= cond.$lte;
    if ('$gt' in cond) return docValue > cond.$gt;
    if ('$lt' in cond) return docValue < cond.$lt;
    if ('$exists' in cond) return (docValue !== undefined) === cond.$exists;
    return true;
  }
  // Direct equality (compare by string for ids)
  if (docValue instanceof Date || cond instanceof Date) {
    return new Date(docValue).getTime() === new Date(cond).getTime();
  }
  if (Array.isArray(docValue)) {
    return docValue.some((v) => String(v) === String(cond));
  }
  return String(docValue) === String(cond);
}

function matchQuery(doc, query) {
  if (!query || typeof query !== 'object') return true;
  for (const [key, cond] of Object.entries(query)) {
    if (key === '_id' && cond && typeof cond === 'object' && cond.$in) {
      if (!cond.$in.some((v) => idsEqual(doc._id, v))) return false;
      continue;
    }
    if (key.includes('.')) {
      const docValue = getNested(doc, key);
      if (!matchValue(docValue, cond)) return false;
      continue;
    }
    if (!matchValue(doc[key], cond)) return false;
  }
  return true;
}

const SORT_DIR = { asc: 1, ascending: 1, desc: -1, descending: -1 };

function applySort(docs, sortSpec) {
  if (!sortSpec) return docs;
  const entries = typeof sortSpec === 'string'
    ? [[sortSpec.startsWith('-') ? sortSpec.slice(1) : sortSpec, sortSpec.startsWith('-') ? -1 : 1]]
    : Object.entries(sortSpec).map(([k, v]) => [k, v]);
  return [...docs].sort((a, b) => {
    for (const [key, dir] of entries) {
      const d = SORT_DIR[dir] ?? (Number(dir) || 1);
      const av = getNested(a, key);
      const bv = getNested(b, key);
      if (av === bv) continue;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return -1 * d;
      if (av > bv) return 1 * d;
    }
    return 0;
  });
}

/** Apply a mongoose-style update object ($set / $push / $inc or plain replacement). */
function applyUpdate(doc, update) {
  const d = doc;
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) d[k] = deepClone(v);
  }
  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      if (!Array.isArray(d[k])) d[k] = [];
      if (v && v.$each) d[k].push(...deepClone(v.$each));
      else d[k].push(deepClone(v));
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) d[k] = (d[k] || 0) + v;
  }
  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) delete d[k];
  }
  // Plain-object update (no operators) — treat as $set
  const operatorKeys = Object.keys(update).filter((k) => k.startsWith('$'));
  if (operatorKeys.length === 0) {
    for (const [k, v] of Object.entries(update)) {
      if (k !== '_id') d[k] = deepClone(v);
    }
  }
  return d;
}

class InMemoryDocument {
  constructor(modelName, data, schema) {
    const defaults = schema ? schema._defaults() : {};
    Object.assign(this, deepClone(defaults), deepClone(data));
    if (!this._id) this._id = new ObjectId();
    this.__modelName = modelName;
    this.__schema = schema;
  }

  async save() {
    const model = __registry.get(this.__modelName);
    const hooks = this.__schema && this.__schema._preSaveHooks ? this.__schema._preSaveHooks : [];
    for (const hook of hooks) {
      await hook(this);
    }
    await model._persist(this);
    return this;
  }

  toObject() {
    const out = {};
    for (const [k, v] of Object.entries(this)) {
      if (k.startsWith('__')) continue;
      out[k] = v;
    }
    return deepClone(out);
  }

  toJSON() {
    return this.toObject();
  }
}

/**
 * Factory that returns a callable model: `new Model(data)` constructs a
 * document instance, while `Model.find(...)`, `Model.create(...)` etc. are the
 * static query/build methods — mirroring the Mongoose API.
 */
function createInMemoryModel(modelName, schema) {
  const helpers = {};

  helpers._docs = () => collections.get(modelName);

  helpers._instantiate = (doc) => {
    Object.setPrototypeOf(doc, InMemoryDocument.prototype);
    doc.__modelName = modelName;
    doc.__schema = schema;
    return doc;
  };

  helpers._runPreSaveHooks = (doc) => {
    const hooks = schema && schema._preSaveHooks ? schema._preSaveHooks : [];
    return hooks.reduce((p, hook) => p.then(() => hook(doc)), Promise.resolve());
  };

  helpers._persist = async (doc) => {
    const plain = doc.toObject ? doc.toObject() : doc;
    const list = collections.get(modelName);
    const idx = list.findIndex((d) => idsEqual(d._id, plain._id));
    const stored = deepClone(plain);
    if (idx >= 0) list[idx] = stored;
    else list.push(stored);
    Object.assign(doc, stored);
    return doc;
  };

  helpers.create = async (data) => {
    const items = Array.isArray(data) ? data : [data];
    const created = [];
    for (const item of items) {
      const defaults = schema ? schema._defaults() : {};
      const doc = new InMemoryDocument(modelName, { ...defaults, ...item }, schema);
      doc.createdAt = doc.createdAt || new Date();
      doc.updatedAt = new Date();
      await helpers._runPreSaveHooks(doc);
      await helpers._persist(doc);
      created.push(helpers._instantiate(deepClone(helpers._docs().find((d) => idsEqual(d._id, doc._id)))));
    }
    return Array.isArray(data) ? created : created[0];
  };

  helpers.find = (query = {}) => new Query(helpers, query);
  helpers.findOne = (query = {}) => new Query(helpers, query)._setSingle();
  helpers.findById = (id) => new Query(helpers, { _id: id })._setSingle();
  helpers.countDocuments = async (query = {}) => helpers._docs().filter((d) => matchQuery(d, query)).length;
  helpers.exists = async (query = {}) => {
    const doc = helpers._docs().find((d) => matchQuery(d, query));
    return doc ? { _id: doc._id } : null;
  };
  helpers.updateMany = async (query = {}, update = {}) => {
    let n = 0;
    for (const d of helpers._docs()) {
      if (matchQuery(d, query)) { applyUpdate(d, update); d.updatedAt = new Date(); n++; }
    }
    return { matchedCount: n, modifiedCount: n };
  };
  helpers.updateOne = async (query = {}, update = {}) => {
    const d = helpers._docs().find((x) => matchQuery(x, query));
    if (d) { applyUpdate(d, update); d.updatedAt = new Date(); }
    return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 };
  };
  helpers.findByIdAndUpdate = async (id, update, options = {}) => {
    const d = helpers._docs().find((x) => idsEqual(x._id, id) || idsEqual(x._id, id?._id));
    if (!d) {
      if (options.upsert) return helpers.create({ ...(update.$set || update), _id: id });
      return null;
    }
    applyUpdate(d, update);
    d.updatedAt = new Date();
    return options.new === false ? d : helpers._instantiate(deepClone(d));
  };
  helpers.findOneAndUpdate = async (query, update, options = {}) => {
    const d = helpers._docs().find((x) => matchQuery(x, query));
    if (!d) {
      if (options.upsert) return helpers.create(update.$set || update);
      return null;
    }
    applyUpdate(d, update);
    d.updatedAt = new Date();
    return options.new === false ? d : helpers._instantiate(deepClone(d));
  };
  helpers.findByIdAndDelete = async (id) => {
    const list = collections.get(modelName);
    const idx = list.findIndex((x) => idsEqual(x._id, id));
    if (idx < 0) return null;
    const [removed] = list.splice(idx, 1);
    return helpers._instantiate(removed);
  };
  helpers.deleteMany = async (query = {}) => {
    const list = collections.get(modelName);
    const kept = list.filter((d) => !matchQuery(d, query));
    const removed = list.length - kept.length;
    collections.set(modelName, kept);
    return { deletedCount: removed };
  };
  helpers.deleteOne = async (query = {}) => {
    const list = collections.get(modelName);
    const idx = list.findIndex((d) => matchQuery(d, query));
    if (idx >= 0) list.splice(idx, 1);
    return { deletedCount: idx >= 0 ? 1 : 0 };
  };

  // The callable model: `new Model(data)` returns a document instance.
  const Model = function (data) {
    const defaults = schema ? schema._defaults() : {};
    return new InMemoryDocument(modelName, { ...defaults, ...data }, schema);
  };
  Object.assign(Model, helpers);
  Model.modelName = modelName;
  Model.schema = schema;

  if (!collections.has(modelName)) collections.set(modelName, []);
  __registry.set(modelName, Model);

  return Model;
}

class InMemoryModelLegacyUnused {
  constructor(modelName, schema) {
    this.modelName = modelName;
    this.schema = schema;
    if (!collections.has(modelName)) collections.set(modelName, []);
    __registry.set(modelName, this);
  }

  _docs() {
    return collections.get(this.modelName);
  }

  _instantiate(doc) {
    Object.setPrototypeOf(doc, InMemoryDocument.prototype);
    doc.__modelName = this.modelName;
    doc.__schema = this.schema;
    return doc;
  }

  async _persist(doc) {
    const plain = doc.toObject ? doc.toObject() : doc;
    const list = this._docs();
    const idx = list.findIndex((d) => idsEqual(d._id, plain._id));
    const stored = deepClone(plain);
    if (idx >= 0) list[idx] = stored;
    else list.push(stored);
    Object.assign(doc, stored);
    return doc;
  }

  _runPreSaveHooks(doc) {
    const hooks = this.schema && this.schema._preSaveHooks ? this.schema._preSaveHooks : [];
    return hooks.reduce((p, hook) => p.then(() => hook(doc)), Promise.resolve());
  }

  async create(data) {
    const items = Array.isArray(data) ? data : [data];
    const created = [];
    for (const item of items) {
      const defaults = this.schema ? this.schema._defaults() : {};
      const doc = new InMemoryDocument(this.modelName, { ...defaults, ...item }, this.schema);
      doc.createdAt = doc.createdAt || new Date();
      doc.updatedAt = new Date();
      await this._runPreSaveHooks(doc);
      await this._persist(doc);
      created.push(this._instantiate(deepClone(this._docs().find((d) => idsEqual(d._id, doc._id)))));
    }
    return Array.isArray(data) ? created : created[0];
  }

  find(query = {}) {
    return new Query(this, query);
  }
  findOne(query = {}) {
    return new Query(this, query)._setSingle();
  }
  findById(id) {
    return new Query(this, { _id: id })._setSingle();
  }
  async countDocuments(query = {}) {
    return this._docs().filter((d) => matchQuery(d, query)).length;
  }
  async exists(query = {}) {
    const doc = this._docs().find((d) => matchQuery(d, query));
    return doc ? { _id: doc._id } : null;
  }
  async updateMany(query = {}, update = {}) {
    let n = 0;
    for (const d of this._docs()) {
      if (matchQuery(d, query)) {
        applyUpdate(d, update);
        d.updatedAt = new Date();
        n++;
      }
    }
    return { matchedCount: n, modifiedCount: n };
  }
  async updateOne(query = {}, update = {}) {
    const d = this._docs().find((x) => matchQuery(x, query));
    if (d) {
      applyUpdate(d, update);
      d.updatedAt = new Date();
    }
    return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 };
  }
  async findByIdAndUpdate(id, update, options = {}) {
    const d = this._docs().find((x) => idsEqual(x._id, id) || idsEqual(x._id, id?._id));
    if (!d) {
      if (options.upsert) {
        const created = await this.create({ ...(update.$set || update), _id: id });
        return created;
      }
      return null;
    }
    applyUpdate(d, update);
    d.updatedAt = new Date();
    return options.new === false ? d : this._instantiate(deepClone(d));
  }
  async findOneAndUpdate(query, update, options = {}) {
    const d = this._docs().find((x) => matchQuery(x, query));
    if (!d) {
      if (options.upsert) return this.create(update.$set || update);
      return null;
    }
    applyUpdate(d, update);
    d.updatedAt = new Date();
    return options.new === false ? d : this._instantiate(deepClone(d));
  }
  async findByIdAndDelete(id) {
    const list = this._docs();
    const idx = list.findIndex((x) => idsEqual(x._id, id));
    if (idx < 0) return null;
    const [removed] = list.splice(idx, 1);
    return this._instantiate(removed);
  }
  async deleteMany(query = {}) {
    const list = this._docs();
    const kept = list.filter((d) => !matchQuery(d, query));
    const removed = list.length - kept.length;
    collections.set(this.modelName, kept);
    return { deletedCount: removed };
  }
  async deleteOne(query = {}) {
    const list = this._docs();
    const idx = list.findIndex((d) => matchQuery(d, query));
    if (idx >= 0) list.splice(idx, 1);
    return { deletedCount: idx >= 0 ? 1 : 0 };
  }
}

class Query {
  constructor(model, query) {
    this._model = model;
    this._query = query;
    this._single = false;
    this._sort = null;
    this._limit = null;
    this._skip = 0;
    this._populates = [];
    this._lean = false;
  }
  _setSingle() {
    this._single = true;
    return this;
  }
  sort(spec) {
    this._sort = spec;
    return this;
  }
  limit(n) {
    this._limit = n;
    return this;
  }
  skip(n) {
    this._skip = n;
    return this;
  }
  populate() {
    // No-op: embedded data is already sufficient for responses.
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  async exec() {
    let docs = this._model._docs().filter((d) => matchQuery(d, this._query));
    docs = applySort(docs, this._sort);
    if (this._skip) docs = docs.slice(this._skip);
    if (this._limit != null) docs = docs.slice(0, this._limit);
    if (this._single) {
      if (!docs.length) return null;
      return this._lean ? deepClone(docs[0]) : this._model._instantiate(deepClone(docs[0]));
    }
    return this._lean
      ? docs.map((d) => deepClone(d))
      : docs.map((d) => this._model._instantiate(deepClone(d)));
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  catch(fn) {
    return this.exec().catch(fn);
  }
}

module.exports = {
  createInMemoryModel,
  InMemoryModel: createInMemoryModel,
  InMemoryDocument,
  ObjectId,
  collections,
  objectId
};
