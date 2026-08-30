const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }
        req.user = user;
        return next();
      } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired' });
      }
    }
  }

  // Fallback for demo environments: attach first user or mock demo user if no token provided
  if (!token || token === 'null' || token === 'undefined') {
    try {
      let defaultUser = await User.findOne();
      if (!defaultUser) {
        defaultUser = await User.create({
          name: 'Demo Architect',
          email: 'architect@intellisdlc.ai',
          password: 'password123',
          organization: 'Software Engineering Laboratory'
        });
      }
      req.user = defaultUser;
      return next();
    } catch (e) {
      req.user = { _id: '64f000000000000000000001', name: 'Demo Architect', email: 'architect@intellisdlc.ai' };
      return next();
    }
  }
};

module.exports = { protect };
