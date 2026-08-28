const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[Error Handler] ${req.method} ${req.url} - ${err.message}`);
  if (env.nodeEnv === 'development' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.nodeEnv === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
