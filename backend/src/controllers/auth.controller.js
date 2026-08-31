const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const env = require('../config/env');

const generateToken = (id) => {
  return jwt.sign({ id }, env.jwtSecret, { expiresIn: '30d' });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, organization } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    user = await User.create({ name, email, password, organization });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && user.authProvider && user.authProvider !== 'local' && !user.password) {
      return res.status(400).json({
        success: false,
        message: `This account is registered with ${user.authProvider === 'google' ? 'Google' : 'GitHub'}. Please use 'Sign in with ${user.authProvider === 'google' ? 'Google' : 'GitHub'}'.`
      });
    }

    const passwordOk = user
      ? (typeof user.matchPassword === 'function'
        ? await user.matchPassword(password)
        : await User.matchPasswordFor(user, password))
      : false;
    if (user && passwordOk) {
      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          token: generateToken(user._id)
        }
      });
    }

    res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, organization, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (organization) user.organization = organization.trim();
    if (avatar !== undefined) user.avatar = avatar;

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      await User.findByIdAndUpdate(user._id, {
        name: user.name,
        organization: user.organization,
        avatar: user.avatar
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH
// ─────────────────────────────────────────────────────────────────────────────

exports.googleAuth = (req, res) => {
  const mode = req.query.mode === 'register' ? 'register' : 'login';
  const redirectUri = env.google.callbackUrl;
  const clientId = env.google.clientId;

  if (!clientId || !env.google.clientSecret) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('Google OAuth is not configured in .env.')}`);
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${mode}&access_type=offline&prompt=consent`;

  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  const { code, state: mode, error } = req.query;
  const clientUrl = env.clientUrl;

  if (error || !code) {
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error || 'Google authentication cancelled')}`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.callbackUrl,
      grant_type: 'authorization_code'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const { access_token } = tokenRes.data;
    if (!access_token) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google failed to issue access token')}`);
    }

    // 2. Fetch user profile from Google
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { sub: googleId, email, name, picture } = profileRes.data;
    if (!email) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google account has no verified email.')}`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    // 3. Mode Enforcement:
    // If mode is 'login' and user does NOT exist, reject with clear register guidance
    if (mode === 'login' && !user) {
      return res.redirect(`${clientUrl}/login?error=account_not_found&provider=google&email=${encodeURIComponent(normalizedEmail)}`);
    }

    // If mode is 'register' and user does not exist, create the account
    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'google',
        providerId: googleId,
        avatar: picture || '',
        organization: 'Engineering Dept',
        role: 'ENGINEER'
      });
    } else {
      // User exists — update providerId and avatar if missing
      if (!user.providerId) {
        user.providerId = googleId;
        user.authProvider = user.authProvider || 'google';
      }
      if (picture && !user.avatar) user.avatar = picture;
      const validRoles = ['ENGINEER', 'PRODUCT_OWNER', 'ADMIN', 'REVIEWER', 'STUDENT', 'FACULTY', 'DEVELOPER', 'MANAGER', 'USER'];
      if (!validRoles.includes(user.role)) user.role = 'ENGINEER';
      if (typeof user.save === 'function') await user.save();
    }

    const token = generateToken(user._id);
    return res.redirect(`${clientUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    const errMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
    console.error('Google OAuth callback error:', errMsg);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(`Google auth error: ${errMsg}`)}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB OAUTH
// ─────────────────────────────────────────────────────────────────────────────

exports.githubAuth = (req, res) => {
  const mode = req.query.mode === 'register' ? 'register' : 'login';
  const redirectUri = env.github.callbackUrl;
  const clientId = env.github.clientId;

  if (!clientId || !env.github.clientSecret) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('GitHub OAuth is not configured in .env.')}`);
  }

  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email%20read:user&state=${mode}`;

  res.redirect(url);
};

exports.githubCallback = async (req, res) => {
  const { code, state: mode, error, error_description } = req.query;
  const clientUrl = env.clientUrl;

  if (error || !code) {
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error_description || error || 'GitHub authentication cancelled')}`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: env.github.clientId,
        client_secret: env.github.clientSecret,
        code,
        redirect_uri: env.github.callbackUrl
      },
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'IntelliSDLC-AI'
        }
      }
    );

    if (tokenRes.data?.error) {
      const errDetail = tokenRes.data.error_description || tokenRes.data.error;
      console.error('GitHub token exchange error:', errDetail);
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(errDetail)}`);
    }

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('GitHub failed to issue access token')}`);
    }

    // 2. Fetch user profile from GitHub (GitHub REQUIRES User-Agent header)
    const profileRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'IntelliSDLC-AI'
      }
    });
    const githubUser = profileRes.data;

    let email = githubUser.email;
    if (!email) {
      const emailsRes = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'IntelliSDLC-AI'
        }
      });
      const primary = (emailsRes.data || []).find((e) => e.primary && e.verified) || emailsRes.data?.[0];
      email = primary?.email;
    }

    if (!email) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('GitHub account has no public or verified email address.')}`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    // 3. Mode Enforcement:
    // If mode is 'login' and user does NOT exist, reject with clear register guidance
    if (mode === 'login' && !user) {
      return res.redirect(`${clientUrl}/login?error=account_not_found&provider=github&email=${encodeURIComponent(normalizedEmail)}`);
    }

    // If mode is 'register' and user does not exist, create the account
    if (!user) {
      user = await User.create({
        name: githubUser.name || githubUser.login || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'github',
        providerId: String(githubUser.id),
        avatar: githubUser.avatar_url || '',
        organization: 'Engineering Dept',
        role: 'ENGINEER'
      });
    } else {
      // User exists — update providerId and avatar if missing
      if (!user.providerId) {
        user.providerId = String(githubUser.id);
        user.authProvider = user.authProvider || 'github';
      }
      if (githubUser.avatar_url && !user.avatar) user.avatar = githubUser.avatar_url;
      const validRoles = ['ENGINEER', 'PRODUCT_OWNER', 'ADMIN', 'REVIEWER', 'STUDENT', 'FACULTY', 'DEVELOPER', 'MANAGER', 'USER'];
      if (!validRoles.includes(user.role)) user.role = 'ENGINEER';
      if (typeof user.save === 'function') await user.save();
    }

    const token = generateToken(user._id);
    return res.redirect(`${clientUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error('GitHub OAuth callback error:', errMsg);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(`GitHub auth error: ${errMsg}`)}`);
  }
};
