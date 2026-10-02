'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';

import AuthLayout from '../../components/AuthLayout';

import {
  FiAlertCircle as AlertCircle,
  FiArrowRight as ArrowRight,
  FiGithub as GithubIcon,
  FiLock as Lock,
  FiMail as Mail,
  FiUserPlus as UserPlus,
  FiEye as Eye,
  FiEyeOff as EyeOff,
} from 'react-icons/fi';

import { FcGoogle as GoogleIcon } from 'react-icons/fc';


function LoginForm() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [notRegisteredProvider, setNotRegisteredProvider] =
    useState(null);

  const [showPassword, setShowPassword] = useState(false);


  /* ============================================================
     EXISTING LOGIN LOGIC — UNCHANGED
     ============================================================ */

  useEffect(() => {

    if (user) {
      router.push('/dashboard');
    }

  }, [user, router]);


  useEffect(() => {

    const errParam = searchParams.get('error');
    const prov = searchParams.get('provider');

    if (errParam === 'account_not_found') {

      setNotRegisteredProvider(
        prov || 'Google/GitHub'
      );

      setError(
        `Account not found. You have not registered with ${
          prov === 'google' ? 'Google' : 'GitHub'
        } yet. Please register first.`
      );

    } else if (errParam) {

      setError(decodeURIComponent(errParam));

    }

  }, [searchParams]);


  const handleSubmit = async (e) => {

    e.preventDefault();

    setError('');
    setNotRegisteredProvider(null);
    setLoading(true);

    try {

      await login(email, password);

      router.push('/dashboard');

    } catch (err) {

      setError(
        err.response?.data?.message ||
        err.message ||
        'Invalid email or password'
      );

    } finally {

      setLoading(false);

    }

  };


  const handleFillDemo = () => {

    setEmail('demo@intellisdlc.ai');
    setPassword('password123');

  };


  const handleOAuthLogin = (provider) => {

    const url =
      provider === 'google'
        ? authAPI.getGoogleAuthUrl('login')
        : authAPI.getGithubAuthUrl('login');

    window.location.href = url;

  };


  return (

    <AuthLayout

      title="Welcome Back"

      subtitle={
        <>
          Log in to continue to your workspace and
          <br />
          manage your requirements with ease.
        </>
      }

    >

      {/* ========================================================
          ERROR
          ======================================================== */}

      {error && (

        <div
          className="
            mb-3
            p-2.5
            bg-red-50
            border
            border-red-200
            rounded-xl
            text-xs
            text-red-700
          "
        >

          <div className="flex items-start gap-2">

            <AlertCircle
              className="
                w-4
                h-4
                shrink-0
                text-red-500
                mt-0.5
              "
            />

            <span className="leading-5 font-medium">
              {error}
            </span>

          </div>


          {notRegisteredProvider && (

            <div
              className="
                mt-2
                pt-2
                border-t
                border-red-200
                flex
                items-center
                justify-between
              "
            >

              <span className="text-[10px] text-red-500">
                Need to create an account?
              </span>

              <Link
                href="/register"
                className="
                  inline-flex
                  items-center
                  gap-1
                  px-2.5
                  py-1
                  rounded-lg
                  bg-blue-50
                  hover:bg-blue-100
                  text-blue-600
                  font-semibold
                  text-[10px]
                "
              >

                <UserPlus className="w-3 h-3" />

                Register Now

              </Link>

            </div>

          )}

        </div>

      )}


      {/* ========================================================
          LOGIN FORM
          ======================================================== */}

      <form
        onSubmit={handleSubmit}
        className="space-y-2.5"
      >

        {/* Email */}

        <div>

          <label
            className="
              block
              text-[11px]
              font-medium
              text-[#14244a]
              mb-1
            "
          >
            Email Address
          </label>

          <div className="relative">

            <Mail
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                w-4
                h-4
                text-[#7c93bd]
              "
            />

            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full
                h-[44px]
                pl-11
                pr-4
                rounded-xl
                border
                border-[#d5e0f2]
                bg-white
                text-[#17264b]
                text-[12px]
                outline-none
                placeholder:text-[#8298bd]
                hover:border-[#b8c9e5]
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
              "
            />

          </div>

        </div>


        {/* Password */}

        <div>

          <label
            className="
              block
              text-[11px]
              font-medium
              text-[#14244a]
              mb-1
            "
          >
            Password
          </label>

          <div className="relative">

            <Lock
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                w-4
                h-4
                text-[#7c93bd]
              "
            />

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="
                w-full
                h-[44px]
                pl-11
                pr-11
                rounded-xl
                border
                border-[#d5e0f2]
                bg-white
                text-[#17264b]
                text-[12px]
                outline-none
                placeholder:text-[#8298bd]
                hover:border-[#b8c9e5]
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-[#7890b8]
                hover:text-blue-600
              "
            >

              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}

            </button>

          </div>

        </div>


        {/* Remember + Forgot */}

        <div
          className="
            flex
            items-center
            justify-between
            pt-0.5
          "
        >

          <label
            className="
              flex
              items-center
              gap-2
              text-[11px]
              text-[#31466e]
              cursor-pointer
            "
          >

            <input
              type="checkbox"
              className="
                w-4
                h-4
                rounded
                border-[#c9d7ea]
                text-blue-600
                focus:ring-blue-500
              "
            />

            Remember me

          </label>


          <button
            type="button"
            className="
              text-[11px]
              font-semibold
              text-blue-600
              hover:text-blue-700
            "
          >
            Forgot password?
          </button>

        </div>


        {/* Login Button */}

        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            h-[46px]
            rounded-xl
            bg-blue-600
            hover:bg-blue-700
            disabled:opacity-60
            disabled:cursor-not-allowed
            text-white
            font-semibold
            text-[13px]
            shadow-lg
            shadow-blue-600/20
            flex
            items-center
            justify-center
            gap-2
            transition-all
          "
        >

          {loading
            ? 'Authenticating...'
            : 'Log in'}

          <ArrowRight className="w-4 h-4" />

        </button>

      </form>


      {/* ========================================================
          DIVIDER
          ======================================================== */}

      <div className="flex items-center gap-3 my-3">

        <div className="flex-1 h-px bg-[#dbe4f2]" />

        <span
          className="
            text-[9px]
            text-[#8195b9]
            whitespace-nowrap
          "
        >
          Or continue with
        </span>

        <div className="flex-1 h-px bg-[#dbe4f2]" />

      </div>


      {/* ========================================================
          SOCIAL LOGIN
          ======================================================== */}

      <div className="grid grid-cols-2 gap-3">

        {/* Google */}

        <button
          type="button"
          onClick={() =>
            handleOAuthLogin('google')
          }
          className="
            h-[43px]
            px-2
            rounded-xl
            bg-white
            border
            border-[#d5e0f2]
            hover:border-[#b8c9e5]
            hover:bg-[#f8fbff]
            text-[#18284d]
            font-medium
            text-[11px]
            flex
            items-center
            justify-center
            gap-2
            transition
          "
        >

          <GoogleIcon className="w-4 h-4" />

          Continue with Google

        </button>


        {/* GitHub */}

        <button
          type="button"
          onClick={() =>
            handleOAuthLogin('github')
          }
          className="
            h-[43px]
            px-2
            rounded-xl
            bg-white
            border
            border-[#d5e0f2]
            hover:border-[#b8c9e5]
            hover:bg-[#f8fbff]
            text-[#18284d]
            font-medium
            text-[11px]
            flex
            items-center
            justify-center
            gap-2
            transition
          "
        >

          <GithubIcon className="w-4 h-4" />

          Continue with GitHub

        </button>

      </div>


      {/* ========================================================
          REGISTER
          ======================================================== */}

      <div className="text-center mt-3">

        <span className="text-[11px] text-[#7b90b5]">
          Don't have an account?{' '}
        </span>

        <Link
          href="/register"
          className="
            text-[11px]
            font-semibold
            text-blue-600
            hover:text-blue-700
          "
        >
          Create one
        </Link>

      </div>


      {/* Demo */}

      <div className="text-center mt-2">

        <button
          type="button"
          onClick={handleFillDemo}
          className="
            text-[10px]
            text-[#8195b9]
            hover:text-blue-600
            transition
          "
        >
          Use demo credentials
        </button>

      </div>


      {/* Standards */}

      <p
        className="
          text-center
          text-[8px]
          text-[#9aaac3]
          mt-3
          leading-3
        "
      >
        Conforms to ISO/IEC/IEEE 29148:2018 & IEEE 830-1998 Standards
      </p>

    </AuthLayout>

  );
}


export default function LoginPage() {

  return (

    <Suspense
      fallback={
        <div
          className="
            h-screen
            bg-white
            flex
            items-center
            justify-center
          "
        >

          <div
            className="
              w-8
              h-8
              border-2
              border-blue-200
              border-t-blue-600
              rounded-full
              animate-spin
            "
          />

        </div>
      }
    >

      <LoginForm />

    </Suspense>

  );

}