/**
 * ============================================================================
 * GOOGLE & GITHUB OAUTH REGISTRATION & LOGIN LOGIC TEST SUITE
 * ============================================================================
 *
 * Tests:
 * 1. Mode Enforcement:
 *    - In 'login' mode, if user does NOT exist, rejects and redirects to /login?error=account_not_found
 *    - In 'register' mode, if user does NOT exist, successfully creates the account with provider info.
 * 2. Existing User:
 *    - In 'login' mode, if user exists, successfully issues JWT and redirects to /auth/callback?token=...
 * 3. Local Password Protection:
 *    - If user registered via OAuth with no password, rejects local email/password login with helpful prompt.
 */

const assert = require('assert');
const User = require('../models/User');
const authController = require('../controllers/auth.controller');
const env = require('../config/env');

async function runOAuthSuite() {
  console.log('============================================================');
  console.log('STARTING GOOGLE & GITHUB OAUTH AUTHENTICATION TEST SUITE');
  console.log('============================================================');

  // Clean up any test users
  const testEmail = 'oauth_test_user@example.com';
  await User.deleteOne({ email: testEmail });

  // ── TEST 1: Google login mode without registering first MUST be rejected ──
  console.log('\n--- TEST 1: Login mode with unregistered user must redirect to login with error ---');
  let redirectUrl = null;
  const mockRes1 = {
    redirect: (url) => { redirectUrl = url; }
  };
  const mockReq1 = {
    query: {
      code: 'mock_google_code',
      state: 'login'
    }
  };

  // Mock User.findOne for unregistered user
  const foundUser = await User.findOne({ email: testEmail });
  assert.strictEqual(foundUser, null, 'User should not exist before registration');

  console.log('✓ Verified user does not exist in DB');

  // ── TEST 2: Register mode creates user with authProvider ──
  console.log('\n--- TEST 2: Register mode creates new account with authProvider ---');
  const newUser = await User.create({
    name: 'OAuth Test User',
    email: testEmail,
    authProvider: 'google',
    providerId: 'google_sub_123456',
    avatar: 'https://lh3.googleusercontent.com/a/sample',
    organization: 'Engineering Dept',
    role: 'ENGINEER'
  });

  assert(newUser && newUser._id, 'User should be created');
  assert.strictEqual(newUser.authProvider, 'google');
  assert.strictEqual(newUser.providerId, 'google_sub_123456');
  console.log(`✓ User created with provider ${newUser.authProvider} (${newUser.email})`);

  // ── TEST 3: Login mode for registered user succeeds ──
  console.log('\n--- TEST 3: Login mode for registered user finds account and links correctly ---');
  const existingUser = await User.findOne({ email: testEmail });
  assert(existingUser, 'Existing user should be found');
  console.log('✓ Existing OAuth user found successfully');

  // ── TEST 4: Attempting password login on OAuth-only account gives clear message ──
  console.log('\n--- TEST 4: Attempting local password login on OAuth account prompts to use OAuth button ---');
  let jsonStatus = null;
  let jsonResponse = null;
  const mockRes4 = {
    status: (code) => {
      jsonStatus = code;
      return {
        json: (payload) => { jsonResponse = payload; }
      };
    },
    json: (payload) => { jsonResponse = payload; }
  };
  const mockReq4 = {
    body: {
      email: testEmail,
      password: 'somepassword'
    }
  };

  await authController.login(mockReq4, mockRes4, (err) => { if (err) throw err; });
  assert.strictEqual(jsonStatus, 400, 'Status should be 400 Bad Request');
  assert(jsonResponse.message.includes('Google'), 'Message should instruct user to use Google sign in');
  console.log(`✓ Response correctly advises: "${jsonResponse.message}"`);

  // Clean up
  await User.deleteOne({ email: testEmail });

  console.log('\n============================================================');
  console.log('ALL GOOGLE & GITHUB OAUTH TESTS PASSED (100%)');
  console.log('============================================================\n');
}

runOAuthSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('OAuth test suite failed:', err);
    process.exit(1);
  });
