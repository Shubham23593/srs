'use client';

import React from 'react';
import {
  FiCheck,
  FiFileText,
  FiGitBranch,
  FiMessageSquare,
  FiMoreHorizontal,
  FiSearch,
} from 'react-icons/fi';

const requirementsList = [
  { id: 'FR-001', text: 'Students shall view available events.', status: 'Validated' },
  { id: 'FR-002', text: 'Students shall register for events.', status: 'Validated' },
  { id: 'FR-003', text: 'Administrators shall create events.', status: 'Review' },
  { id: 'FR-004', text: 'System shall enforce venue seating limits.', status: 'Validated' },
  { id: 'FR-005', text: 'Users shall authenticate via University SSO.', status: 'Validated' },
  { id: 'FR-006', text: 'Organizers shall export attendee list to CSV.', status: 'Validated' },
];

export default function Hero3D() {
  // Duplicate list for seamless infinite loop
  const tickerItems = [...requirementsList, ...requirementsList];

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e4e7ec',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(16, 24, 40, 0.10)',
          overflow: 'hidden',
          animation: 'heroFloat 6s ease-in-out infinite',
        }}
      >
        {/* Browser header */}
        <div
          style={{
            height: '46px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid #eef0f3',
            background: '#fafafa',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />

          <div
            style={{
              marginLeft: '12px',
              flex: 1,
              height: '27px',
              borderRadius: '6px',
              background: '#f2f4f7',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              color: '#98a2b3',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            app.aether.ai / project / requirements
          </div>

          <FiMoreHorizontal size={17} color="#98a2b3" />
        </div>

        {/* Application layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            minHeight: '430px',
          }}
        >
          {/* Sidebar */}
          <aside
            style={{
              borderRight: '1px solid #eef0f3',
              padding: '18px 12px',
              background: '#fbfcfd',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 750,
                color: '#344054',
                padding: '0 8px',
                marginBottom: '18px',
                letterSpacing: '-0.01em',
              }}
            >
              COLLEGE EVENT SYSTEM
            </div>

            {[
              ['Overview', FiFileText],
              ['Interview', FiMessageSquare],
              ['Requirements', FiCheck],
              ['Quality Review', FiSearch],
              ['Traceability', FiGitBranch],
            ].map(([label, Icon], index) => {
              const isActive = index === 2;
              return (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '9px 8px',
                    borderRadius: '7px',
                    marginBottom: '3px',
                    color: isActive ? '#0284c7' : '#667085',
                    background: isActive ? '#f0f9ff' : 'transparent',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#0284c7',
                        marginLeft: 'auto',
                      }}
                    />
                  )}
                </div>
              );
            })}

            <div
              style={{
                height: '1px',
                background: '#eaecf0',
                margin: '17px 8px',
              }}
            />

            <div
              style={{
                padding: '0 8px',
                color: '#98a2b3',
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Project status
            </div>

            <div
              style={{
                margin: '10px 8px',
                padding: '9px',
                borderRadius: '7px',
                border: '1px solid #bae6fd',
                background: '#f0f9ff',
              }}
            >
              <div
                style={{
                  color: '#0369a1',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#0284c7',
                  }}
                  className="status-pulse-dot"
                />
                Requirements active
              </div>

              <div
                style={{
                  color: '#667085',
                  fontSize: '9px',
                  marginTop: '3px',
                  marginLeft: '12px',
                }}
              >
                18 requirements
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main
            style={{
              padding: '22px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Header row */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div
                    style={{
                      color: '#98a2b3',
                      fontSize: '9px',
                      marginBottom: '4px',
                      fontWeight: 700,
                    }}
                  >
                    PROJECT / REQUIREMENTS
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      letterSpacing: '-0.025em',
                      color: '#1d2939',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    College Event Management System
                  </h3>
                </div>

                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    fontSize: '9px',
                    fontWeight: 700,
                    border: '1px solid #bae6fd',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#0284c7',
                    }}
                    className="status-pulse-dot"
                  />
                  ACTIVE
                </span>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  marginBottom: '18px',
                }}
              >
                {[
                  ['18', 'Requirements'],
                  ['14', 'Validated'],
                  ['92%', 'Quality score'],
                ].map(([value, label], idx) => (
                  <div
                    key={label}
                    style={{
                      padding: '12px 14px',
                      border: '1px solid #eaecf0',
                      borderRadius: '9px',
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: idx === 2 ? '#0284c7' : '#1d2939',
                      }}
                    >
                      {value}
                    </div>

                    <div
                      style={{
                        color: '#98a2b3',
                        fontSize: '9px',
                        marginTop: '3px',
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Requirement panel with animated moving/scrolling text */}
              <div
                style={{
                  border: '1px solid #eaecf0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid #eaecf0',
                    background: '#fcfcfd',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#344054',
                    }}
                  >
                    Functional Requirements
                  </span>

                  <span
                    style={{
                      color: '#0284c7',
                      fontSize: '9px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#0284c7',
                      }}
                      className="status-pulse-dot"
                    />
                    Live Feed (3 of 18)
                  </span>
                </div>

                {/* Animated scrolling viewport */}
                <div
                  style={{
                    height: '126px', // exactly 3 items visible at 42px each
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Subtle top & bottom shadow gradient mask */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '8px',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), transparent)',
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Continuously moving track */}
                  <div className="requirements-moving-track">
                    {tickerItems.map((req, i) => (
                      <div
                        key={`${req.id}-${i}`}
                        style={{
                          height: '42px',
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr 68px',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '0 14px',
                          borderBottom: '1px solid #f2f4f7',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          style={{
                            color: '#0284c7',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                          }}
                        >
                          {req.id}
                        </span>

                        <span
                          style={{
                            color: '#475467',
                            fontSize: '10.5px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {req.text}
                        </span>

                        <span
                          style={{
                            textAlign: 'center',
                            padding: '3px 6px',
                            borderRadius: '5px',
                            background: req.status === 'Validated' ? '#f0f9ff' : '#fffaeb',
                            color: req.status === 'Validated' ? '#0369a1' : '#b54708',
                            fontSize: '8px',
                            fontWeight: 700,
                          }}
                        >
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '8px',
                      background: 'linear-gradient(to top, rgba(255,255,255,0.7), transparent)',
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#667085',
                  fontSize: '9px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#0284c7',
                  }}
                  className="status-pulse-dot"
                />
                AI analysis complete
              </div>

              <div
                style={{
                  color: '#0284c7',
                  fontSize: '9px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                View traceability →
              </div>
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }

        /* 6 items * 42px = 252px total height of one loop */
        .requirements-moving-track {
          animation: moveReqs 12s linear infinite;
        }

        .requirements-moving-track:hover {
          animation-play-state: paused;
        }

        @keyframes moveReqs {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-252px);
          }
        }

        .status-pulse-dot {
          animation: pulseDot 2s ease-in-out infinite;
        }

        @keyframes pulseDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.85);
          }
        }

        @media (max-width: 650px) {
          aside {
            display: none !important;
          }
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}