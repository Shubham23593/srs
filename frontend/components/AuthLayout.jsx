'use client';

import React from 'react';
import {
  FiCheck as Check,
  FiFileText as FileText,
  FiBarChart2 as BarChart2,
  FiFolder as Folder,
  FiSettings as Settings,
  FiHome as Home,
} from 'react-icons/fi';

export default function AuthLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="h-screen w-full bg-white flex overflow-hidden">

      {/* =====================================================
          LEFT SIDE
      ===================================================== */}

      <section
        className="
          w-full
          lg:w-[48%]
          xl:w-[47%]
          h-screen
          bg-white
          flex
          flex-col
          justify-center
          px-6
          sm:px-10
          lg:px-10
          xl:px-14
          overflow-hidden
        "
      >
        <div className="w-full max-w-[520px] mx-auto">

          {/* ================= BRAND ================= */}

          <div className="mb-5">

            <div className="flex items-center gap-3">

              {/* Logo */}

              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-blue-600
                  flex
                  items-center
                  justify-center
                  shadow-md
                  shadow-blue-600/20
                "
              >
                <div
                  className="
                    w-[19px]
                    h-[19px]
                    rounded-md
                    border-[3px]
                    border-white
                    relative
                  "
                >
                  <div
                    className="
                      absolute
                      -right-[5px]
                      -bottom-[5px]
                      w-[11px]
                      h-[11px]
                      bg-blue-600
                      border-2
                      border-white
                      rounded-sm
                    "
                  />
                </div>
              </div>

              {/* Brand */}

              <div>

                <h1
                  className="
                    text-[23px]
                    font-bold
                    tracking-tight
                    text-[#10204a]
                    leading-none
                  "
                >
                  Aether AI
                </h1>

                <p
                  className="
                    text-[8px]
                    font-semibold
                    tracking-[0.26em]
                    text-[#7890bf]
                    mt-1.5
                    uppercase
                  "
                >
                  Requirements Workspace
                </p>

              </div>

            </div>

          </div>


          {/* ================= PAGE TITLE ================= */}

          <div className="mb-4">

            <h2
              className="
                text-[32px]
                sm:text-[34px]
                font-bold
                tracking-[-0.035em]
                text-[#101d40]
                leading-[1.05]
              "
            >
              {title}
            </h2>

            <div
              className="
                mt-2
                text-[13px]
                sm:text-[14px]
                leading-5
                text-[#7890b8]
              "
            >
              {subtitle}
            </div>

          </div>


          {/* ================= PAGE FORM ================= */}

          {children}

        </div>
      </section>


      {/* =====================================================
          RIGHT SIDE — COMMON ILLUSTRATION
      ===================================================== */}

      <section
        className="
          hidden
          lg:flex
          lg:w-[52%]
          xl:w-[53%]
          h-screen
          relative
          overflow-hidden
          bg-[#e9f3ff]
          items-center
          justify-center
        "
      >

        {/* ================= BACKGROUND ================= */}

        <div
          className="
            absolute
            -top-48
            -left-40
            w-[480px]
            h-[480px]
            rounded-full
            bg-white/70
          "
        />

        <div
          className="
            absolute
            -bottom-48
            -right-40
            w-[520px]
            h-[520px]
            rounded-full
            bg-white/50
          "
        />

        <div
          className="
            absolute
            top-[35%]
            -left-40
            w-[400px]
            h-[400px]
            rounded-full
            bg-blue-200/30
          "
        />


        {/* ================= DOTS ================= */}

        <div
          className="
            absolute
            top-16
            right-12
            grid
            grid-cols-5
            gap-3
            opacity-60
          "
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <span
              key={index}
              className="
                w-2
                h-2
                rounded-full
                bg-blue-400/50
              "
            />
          ))}
        </div>


        {/* ================= MAIN CONTENT ================= */}

        <div
          className="
            relative
            z-10
            w-full
            max-w-[610px]
            px-8
          "
        >

          {/* ================= TAGLINE ================= */}

          <div
            className="
              text-center
              mb-5
              -translate-y-6
            "
          >

            <p
              className="
                text-[16px]
                xl:text-[18px]
                leading-6
                text-[#123b82]
                font-medium
              "
            >
              Organize, track, and manage your requirements —
              <span className="text-blue-600 font-bold">
                {' '}all in one place.
              </span>
            </p>

          </div>
          {/* ================= DASHBOARD ================= */}

          <div className="relative">

            {/* Floating document */}

            <div
              className="
                absolute
                -top-12
                right-3
                w-[150px]
                h-[58px]
                bg-white
                rounded-xl
                shadow-[0_16px_36px_rgba(44,91,160,0.18)]
                border
                border-white
                flex
                items-center
                gap-2.5
                px-3
                z-30
                floating-card-doc
              "
            >

              <div
                className="
                  w-8
                  h-9
                  rounded-lg
                  bg-blue-600
                  flex
                  items-center
                  justify-center
                  shadow-sm
                "
              >
                <FileText className="w-4 h-4 text-white" />
              </div>

              <div className="flex-1 space-y-1.5">

                <div className="h-1.5 w-16 bg-blue-100 rounded-full shimmer-bar" />

                <div className="h-1.5 w-10 bg-blue-100 rounded-full shimmer-bar" />

              </div>

            </div>


            {/* ================= BROWSER ================= */}

            <div
              className="
                relative
                w-full
                h-[300px]
                bg-white/95
                backdrop-blur-xl
                rounded-[16px]
                border
                border-white
                shadow-[0_24px_60px_rgba(42,92,160,0.18)]
                overflow-hidden
                browser-mockup-window
              "
            >

              {/* Browser header */}

              <div
                className="
                  h-[34px]
                  border-b
                  border-[#e5edf8]
                  flex
                  items-center
                  px-3
                  gap-1.5
                  bg-[#f8fafc]
                "
              >

                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />

                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />

                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />

              </div>


              <div className="flex h-[266px]">

                {/* ================= SIDEBAR ================= */}

                <div
                  className="
                    w-[82px]
                    bg-[#f5f9ff]
                    border-r
                    border-[#e5edf8]
                    p-2.5
                  "
                >

                  {/* Active */}

                  <div
                    className="
                      h-7
                      rounded-lg
                      bg-blue-100
                      flex
                      items-center
                      gap-1.5
                      px-2
                      mb-3
                      border
                      border-blue-200/60
                    "
                  >

                    <Home className="w-3.5 h-3.5 text-blue-600" />

                    <span
                      className="
                        h-1.5
                        w-5
                        rounded
                        bg-blue-300
                      "
                    />

                  </div>


                  <div className="space-y-3.5">

                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#87a0c7]" />
                      <span className="h-1.5 w-5 rounded bg-[#d6e4f6]" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#87a0c7]" />
                      <span className="h-1.5 w-5 rounded bg-[#d6e4f6]" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#87a0c7]" />
                      <span className="h-1.5 w-5 rounded bg-[#d6e4f6]" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-[#87a0c7]" />
                      <span className="h-1.5 w-5 rounded bg-[#d6e4f6]" />
                    </div>

                  </div>

                </div>


                {/* ================= DASHBOARD CONTENT ================= */}

                <div className="flex-1 p-3">

                  {/* Top */}

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-2.5
                      mb-2.5
                    "
                  >

                    {/* Chart */}

                    <div
                      className="
                        h-[98px]
                        rounded-xl
                        border
                        border-[#e4edf9]
                        bg-white
                        p-2.5
                        relative
                        overflow-hidden
                      "
                    >

                      <div className="space-y-1 mb-1">

                        <div className="h-1.5 w-12 bg-blue-100 rounded-full" />

                        <div className="h-1.5 w-8 bg-blue-50 rounded-full" />

                      </div>

                      <svg
                        viewBox="0 0 220 80"
                        className="w-full h-[55px] overflow-visible"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="authWaveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1877f2" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#1877f2" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Filled area under curve */}
                        <path
                          d="M5 65 C25 45, 35 50, 55 57 S80 35, 100 43 S125 60, 145 28 S170 45, 190 20 S210 15, 218 5 L218 80 L5 80 Z"
                          fill="url(#authWaveGradient)"
                        />

                        {/* Stroke path */}
                        <path
                          d="M5 65 C25 45, 35 50, 55 57 S80 35, 100 43 S125 60, 145 28 S170 45, 190 20 S210 15, 218 5"
                          fill="none"
                          stroke="#1877f2"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Pulsing ring around peak */}
                        <circle
                          cx="218"
                          cy="5"
                          r="8"
                          fill="#1877f2"
                          className="wave-peak-pulse"
                        />

                        <circle
                          cx="218"
                          cy="5"
                          r="4"
                          fill="#1877f2"
                        />

                      </svg>

                    </div>


                    {/* Donut */}

                    <div
                      className="
                        h-[98px]
                        rounded-xl
                        border
                        border-[#e4edf9]
                        bg-white
                        p-2.5
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <div
                        className="
                          relative
                          w-[58px]
                          h-[58px]
                          shrink-0
                          donut-spin-container
                        "
                      >

                        <div
                          className="
                            absolute
                            inset-0
                            rounded-full
                            bg-[conic-gradient(#1478f5_0deg_225deg,#0284c7_225deg_290deg,#f8b735_290deg_335deg,#8255e8_335deg_360deg)]
                          "
                        />

                        <div
                          className="
                            absolute
                            inset-[11px]
                            rounded-full
                            bg-white
                          "
                        />

                        <div
                          className="
                            absolute
                            inset-[21px]
                            rounded-full
                            bg-blue-50
                          "
                        />

                      </div>


                      <div className="space-y-1.5">

                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="h-1.5 w-6 rounded bg-blue-100" />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          <span className="h-1.5 w-6 rounded bg-sky-100" />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="h-1.5 w-6 rounded bg-amber-100" />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="h-1.5 w-6 rounded bg-violet-100" />
                        </div>

                      </div>

                    </div>

                  </div>


                  {/* Bottom */}

                  <div className="grid grid-cols-2 gap-2.5">

                    {/* Status */}

                    <div
                      className="
                        h-[105px]
                        rounded-xl
                        border
                        border-[#e4edf9]
                        bg-white
                        p-3
                      "
                    >

                      <div className="space-y-3">

                        <div className="flex items-center gap-2">

                          <span className="w-3.5 h-3.5 rounded-full bg-blue-400" />

                          <div className="h-2 w-16 rounded-full bg-blue-100 shimmer-bar" />

                        </div>

                        <div className="flex items-center gap-2">

                          <span className="w-3.5 h-3.5 rounded-full bg-sky-400" />

                          <div className="h-2 w-14 rounded-full bg-sky-100 shimmer-bar" />

                        </div>

                        <div className="flex items-center gap-2">

                          <span className="w-3.5 h-3.5 rounded-full bg-violet-500" />

                          <div className="h-2 w-20 rounded-full bg-violet-100 shimmer-bar" />

                        </div>

                      </div>

                    </div>


                    {/* Requirements */}

                    <div
                      className="
                        h-[105px]
                        rounded-xl
                        border
                        border-[#e4edf9]
                        bg-white
                        p-3
                      "
                    >

                      <div className="space-y-2.5">

                        <div className="h-2 w-12 rounded-full bg-blue-100" />

                        <div className="h-2 w-20 rounded-full bg-blue-50 shimmer-bar" />

                        <div className="h-2 w-16 rounded-full bg-blue-50 shimmer-bar" />

                        <div className="h-2 w-24 rounded-full bg-blue-50 shimmer-bar" />

                        <div className="h-2 w-20 rounded-full bg-blue-50 shimmer-bar" />

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>


            {/* ================= ANALYTICS CARD ================= */}

            <div
              className="
                absolute
                right-[-28px]
                top-[85px]
                w-[50px]
                h-[50px]
                bg-white
                rounded-xl
                shadow-[0_16px_36px_rgba(44,91,160,0.18)]
                flex
                items-center
                justify-center
                z-30
                border
                border-white
                floating-card-analytics
              "
            >

              <BarChart2 className="w-6 h-6 text-blue-600 icon-bar-pulse" />

            </div>


            {/* ================= SUCCESS CARD ================= */}

            <div
              className="
                absolute
                right-[-5px]
                bottom-[-24px]
                w-[160px]
                h-[65px]
                bg-white
                rounded-xl
                shadow-[0_16px_36px_rgba(44,91,160,0.18)]
                border
                border-white
                flex
                items-center
                gap-2.5
                px-3
                z-30
                floating-card-success
              "
            >

              <div
                className="
                  w-8
                  h-8
                  rounded-full
                  bg-sky-100
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <Check className="w-5 h-5 text-sky-600" />
              </div>

              <div className="flex-1 space-y-1.5">

                <div className="h-1.5 w-16 rounded-full bg-blue-100 shimmer-bar" />

                <div className="h-1.5 w-11 rounded-full bg-blue-50 shimmer-bar" />

              </div>

            </div>


            {/* ================= DASHED PATH ================= */}

            <svg
              className="
                absolute
                -right-8
                top-[-60px]
                w-[270px]
                h-[180px]
                z-20
                pointer-events-none
              "
              viewBox="0 0 400 280"
              fill="none"
            >

              <path
                d="M10 250 C70 180 30 90 140 55 C220 25 330 40 370 105"
                stroke="#1478f5"
                strokeWidth="2.5"
                strokeDasharray="8 8"
                opacity="0.75"
                className="streaming-dash-path"
              />

            </svg>

          </div>


          {/* ================= BOTTOM LINE ================= */}

          <div
            className="
              absolute
              bottom-6
              left-16
              right-16
              h-px
              bg-blue-400/40
            "
          />

        </div>

      </section>

      <style jsx>{`
        .floating-card-doc {
          animation: floatDoc 5.5s ease-in-out infinite;
        }

        @keyframes floatDoc {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-9px) rotate(1deg);
          }
        }

        .floating-card-analytics {
          animation: floatAnalytics 4.8s ease-in-out infinite;
        }

        @keyframes floatAnalytics {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-8px) translateX(3px);
          }
        }

        .floating-card-success {
          animation: floatSuccess 6s ease-in-out infinite;
        }

        @keyframes floatSuccess {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(8px) rotate(-1deg);
          }
        }

        .browser-mockup-window {
          animation: browserFloat 7s ease-in-out infinite;
        }

        @keyframes browserFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .streaming-dash-path {
          animation: streamDash 14s linear infinite;
        }

        @keyframes streamDash {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -320;
          }
        }

        .wave-peak-pulse {
          animation: waveBeacon 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          transform-origin: 218px 5px;
        }

        @keyframes waveBeacon {
          0% {
            r: 4px;
            opacity: 0.8;
          }
          100% {
            r: 12px;
            opacity: 0;
          }
        }

        .donut-spin-container {
          animation: donutRotate 30s linear infinite;
        }

        @keyframes donutRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .icon-bar-pulse {
          animation: barPulse 2.8s ease-in-out infinite;
        }

        @keyframes barPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }

        .shimmer-bar {
          position: relative;
          overflow: hidden;
        }

        .shimmer-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.75),
            transparent
          );
          animation: barSweep 2.8s ease-in-out infinite;
        }

        @keyframes barSweep {
          0% {
            left: -100%;
          }
          50%, 100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}