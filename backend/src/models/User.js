const bcrypt = require('bcryptjs');
const { registerModel, ObjectId: _O } = require('../db/dataStore');

const definition = {
  fields: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    role: { type: String, enum: ['ENGINEER', 'PRODUCT_OWNER', 'ADMIN', 'REVIEWER', 'STUDENT', 'FACULTY', 'DEVELOPER', 'MANAGER', 'USER'], default: 'ENGINEER' },
    organization: { type: String, default: 'Engineering Dept' },
    authProvider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String },
    avatar: { type: String },
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

User.matchPasswordFor = async function (user, enteredPassword) {
  if (!user || !user.password || !enteredPassword) return false;
  if (!user.password.startsWith('$2')) {
    const directMatch = enteredPassword === user.password;
    if (directMatch) {
      try {
        const hashed = await bcrypt.hash(enteredPassword, 10);
        user.password = hashed;
        if (typeof user.save === 'function') await user.save();
        else await User.findByIdAndUpdate(user._id, { password: hashed });
      } catch (e) {}
    }
    return directMatch;
  }
  return bcrypt.compare(enteredPassword, user.password);
};

module.exports = User;
