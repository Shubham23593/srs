'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';

import AuthLayout from '../../components/AuthLayout';

import {
  FiAlertCircle as AlertCircle,
  FiArrowRight as ArrowRight,
  FiBriefcase as Building,
  FiGithub as GithubIcon,
  FiLock as Lock,
  FiMail as Mail,
  FiUser as User,
  FiEye as Eye,
  FiEyeOff as EyeOff,
} from 'react-icons/fi';

import { FcGoogle as GoogleIcon } from 'react-icons/fc';


function RegisterForm() {

  const router = useRouter();

  const { user, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);


  /* ============================================================
     EXISTING REGISTER LOGIC — UNCHANGED
     ============================================================ */

  useEffect(() => {

    if (user) {
      router.push('/dashboard');
    }

  }, [user, router]);


  const handleSubmit = async (e) => {

    e.preventDefault();

    setError('');
    setLoading(true);

    try {

      await register(
        name,
        email,
        password,
        organization || 'Software Engineering Lab'
      );

      router.push('/dashboard');

    } catch (err) {

      setError(
        err.response?.data?.message ||
        err.message ||
        'Registration failed'
      );

    } finally {

      setLoading(false);

    }

  };


  const handleOAuthRegister = (provider) => {

    const url =
      provider === 'google'
        ? authAPI.getGoogleAuthUrl('register')
        : authAPI.getGithubAuthUrl('register');

    window.location.href = url;

  };


  return (

    <AuthLayout

      title="Create Your Account"

      subtitle={
        <>
          Create your workspace account and
          <br />
          start managing your requirements with ease.
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

        </div>

      )}


      {/* ========================================================
          REGISTER FORM
          ======================================================== */}

      <form
        onSubmit={handleSubmit}
        className="space-y-2.5"
      >

        {/* ================= FULL NAME ================= */}

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
            Full Name *
          </label>

          <div className="relative">

            <User
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
              type="text"
              required
              placeholder="e.g. Shubham Dalvi"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
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


        {/* ================= ORGANIZATION ================= */}

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
            Organization / Lab
          </label>

          <div className="relative">

            <Building
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
              type="text"
              placeholder="e.g. Systems Engineering Dept"
              value={organization}
              onChange={(e) =>
                setOrganization(e.target.value)
              }
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


        {/* ================= EMAIL ================= */}

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
            Email Address *
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
              placeholder="name@organization.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
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


        {/* ================= PASSWORD ================= */}

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
            Password *
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


        {/* ================= REGISTER BUTTON ================= */}

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
            ? 'Creating Account...'
            : 'Register & Enter Workspace'}

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
          SOCIAL REGISTER
          ======================================================== */}

      <div className="grid grid-cols-2 gap-3">

        {/* Google */}

        <button
          type="button"
          onClick={() =>
            handleOAuthRegister('google')
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

          Sign up with Google

        </button>


        {/* GitHub */}

        <button
          type="button"
          onClick={() =>
            handleOAuthRegister('github')
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

          Sign up with GitHub

        </button>

      </div>


      {/* ========================================================
          LOGIN LINK
          ======================================================== */}

      <div className="text-center mt-3">

        <span className="text-[11px] text-[#7b90b5]">
          Already have an account?{' '}
        </span>

        <Link
          href="/login"
          className="
            text-[11px]
            font-semibold
            text-blue-600
            hover:text-blue-700
          "
        >
          Sign In →
        </Link>

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


export default function RegisterPage() {

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

      <RegisterForm />

    </Suspense>

  );

}