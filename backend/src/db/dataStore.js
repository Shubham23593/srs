/**
 * Unified data store.
 *
 * Models are declared ONCE as plain schema descriptors (see src/models/*).
 * When MongoDB is reachable they are compiled to Mongoose models; otherwise
 * they are served by the in-process InMemoryModel shim so the full pipeline
 * remains runnable and testable without an external database.
 */

const mongoose = require('mongoose');
const { InMemoryModel, ObjectId } = require('./inMemoryDB');

const PERSIST_MODE = { mode: 'uninitialized', connected: false };
const modelCache = new Map();

function toMongooseSchema(definition) {
  const fields = definition.fields || {};
  const out = {};

  for (const [name, spec] of Object.entries(fields)) {
    if (spec === ObjectId || (spec && spec.type === ObjectId) || spec === 'ObjectId') {
      out[name] = { type: mongoose.Schema.Types.ObjectId, ref: spec.ref, default: spec.default };
    } else if (Array.isArray(spec)) {
      // Array field: [String] / [Number] / [subSchemaObject]
      const item = spec[0];
      if (item && typeof item === 'object' && !item.type) {
        out[name] = [toMongooseSchema({ fields: item })];
      } else if (item && item.type) {
        if (item.type === ObjectId || item.type === 'ObjectId') {
          out[name] = [{ type: mongoose.Schema.Types.ObjectId, ref: item.ref }];
        } else {
          out[name] = [item];
        }
      } else {
        out[name] = { type: [item || mongoose.Schema.Types.Mixed], default: spec.default ?? [] };
      }
    } else if (spec && typeof spec === 'object' && spec.type) {
      if (spec.type === ObjectId || spec.type === 'ObjectId') {
        out[name] = { type: mongoose.Schema.Types.ObjectId, ref: spec.ref, default: spec.default };
      } else if (spec.type === 'Mixed') {
        out[name] = { type: mongoose.Schema.Types.Mixed, default: spec.default };
      } else {
        out[name] = { ...spec };
      }
    } else if (spec && typeof spec === 'object') {
      // Nested object schema
      out[name] = toMongooseSchema({ fields: spec });
    } else {
      out[name] = spec;
    }
  }

  const schema = new mongoose.Schema(out, { strict: false });
  for (const idx of definition.indexes || []) {
    if (idx.unique) schema.index(idx.fields, { unique: true });
    else schema.index(idx.fields);
  }
  for (const hook of definition.preSave || []) {
    schema.pre('save', function (next) {
      hook(this);
      next();
    });
  }
  return schema;
}

function buildDefaults(definition) {
  const defaults = {};
  const fields = definition.fields || {};
  for (const [name, spec] of Object.entries(fields)) {
    if (Array.isArray(spec)) {
      defaults[name] = spec.length && spec[0] && typeof spec[0] === 'object' ? [] : [];
      continue;
    }
    if (spec && typeof spec === 'object') {
      if ('default' in spec) {
        const d = spec.default;
        defaults[name] = typeof d === 'function' ? d() : (Array.isArray(d) ? [...d] : (typeof d === 'object' && d !== null ? { ...d } : d));
      } else if (spec.type && spec.type !== ObjectId) {
        // nested plain object with typed leaves -> recurse lightly
      }
    }
  }
  return defaults;
}

function registerModel(name, definition) {
  if (modelCache.has(name)) return modelCache.get(name);

  let model;
  try {
    if (mongoose.connection.readyState === 1 && mongoose.models[name]) {
      model = mongoose.models[name];
    } else if (mongoose.connection.readyState === 1) {
      model = mongoose.model(name, toMongooseSchema(definition));
    } else {
      throw new Error('mongoose-not-connected');
    }
  } catch (e) {
    const defaults = buildDefaults(definition);
    model = new InMemoryModel(name, {
      _defaults: () => JSON.parse(JSON.stringify(defaults, (k, v) => (typeof v === 'function' ? v() : v))),
      _preSaveHooks: definition.preSave || []
    });
  }

  modelCache.set(name, model);
  return model;
}

function setPersistMode(mode, connected) {
  PERSIST_MODE.mode = mode;
  PERSIST_MODE.connected = connected;
}

function resetForTests() {
  modelCache.clear();
  const { collections } = require('./inMemoryDB');
  collections.clear();
}

module.exports = {
  registerModel,
  setPersistMode,
  resetForTests,
  ObjectId,
  PERSIST_MODE
};
