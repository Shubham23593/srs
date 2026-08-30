const bcrypt = require('bcryptjs');
const { registerModel, ObjectId: _O } = require('../db/dataStore');

const definition = {
  fields: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ENGINEER', 'PRODUCT_OWNER', 'ADMIN', 'REVIEWER'], default: 'ENGINEER' },
    organization: { type: String, default: 'Engineering Dept' },
    createdAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { email: 1 }, unique: true }],
  preSave: [
    async (doc) => {
      // In-memory mode: hash if the password looks unhashed.
      if (doc.password && !doc.password.startsWith('$2')) {
        doc.password = await bcrypt.hash(doc.password, 10);
      }
    }
  ]
};

const User = registerModel('User', definition);

/**
 * Password verification helper that works for both Mongoose documents and
 * in-memory plain objects.
 */
User.matchPasswordFor = async function (user, enteredPassword) {
  if (!user) return false;
  return bcrypt.compare(enteredPassword, user.password);
};

module.exports = User;
