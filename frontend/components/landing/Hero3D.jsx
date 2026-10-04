'use client';

import {
  FiCheck,
  FiFileText,
  FiGitBranch,
  FiMessageSquare,
  FiMoreHorizontal,
  FiSearch,
} from 'react-icons/fi';

export default function Hero3D() {
  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e4e7ec',
          borderRadius: '16px',
          boxShadow:
            '0 24px 60px rgba(16, 24, 40, 0.10)',
          overflow: 'hidden',
          transform: 'translateY(0)',
          animation: 'heroFloat 6s ease-in-out infinite',
        }}
      >

        {/* Browser header */}

        <div
          style={{
            height: '48px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid #eef0f3',
            background: '#fafafa',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#d0d5dd',
            }}
          />

          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#d0d5dd',
            }}
          />

          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#d0d5dd',
            }}
          />

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
              fontSize: '10px',
            }}
          >
            app.aether.ai / project / requirements
          </div>

          <FiMoreHorizontal
            size={17}
            color="#98a2b3"
          />
        </div>

        {/* Application */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '155px 1fr',
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
            ].map(([label, Icon], index) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '9px 8px',
                  borderRadius: '7px',
                  marginBottom: '3px',
                  color:
                    index === 2
                      ? '#0284c7'
                      : '#667085',
                  background:
                    index === 2
                      ? '#f0f9ff'
                      : 'transparent',
                  fontSize: '11px',
                  fontWeight:
                    index === 2 ? 650 : 500,
                }}
              >
                <Icon size={14} />
                {label}
              </div>
            ))}

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
                }}
              >
                Requirements active
              </div>

              <div
                style={{
                  color: '#667085',
                  fontSize: '9px',
                  marginTop: '3px',
                }}
              >
                18 requirements
              </div>
            </div>

          </aside>

          {/* Main */}

          <main
            style={{
              padding: '22px',
              background: '#ffffff',
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '22px',
              }}
            >

              <div>
                <div
                  style={{
                    color: '#98a2b3',
                    fontSize: '9px',
                    marginBottom: '5px',
                  }}
                >
                  PROJECT / REQUIREMENTS
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    letterSpacing: '-0.025em',
                    color: '#1d2939',
                  }}
                >
                  College Event Management System
                </h3>
              </div>

              <span
                style={{
                  padding: '5px 9px',
                  borderRadius: '999px',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                ACTIVE
              </span>

            </div>

            {/* Stats */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '18px',
              }}
            >

              {[
                ['18', 'Requirements'],
                ['14', 'Validated'],
                ['92%', 'Quality score'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    padding: '13px',
                    border: '1px solid #eaecf0',
                    borderRadius: '9px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 750,
                      color: '#1d2939',
                    }}
                  >
                    {value}
                  </div>

                  <div
                    style={{
                      color: '#98a2b3',
                      fontSize: '9px',
                      marginTop: '3px',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}

            </div>

            {/* Requirement panel */}

            <div
              style={{
                border: '1px solid #eaecf0',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
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
                    color: '#98a2b3',
                    fontSize: '9px',
                  }}
                >
                  3 of 18
                </span>
              </div>

              {[
                [
                  'FR-001',
                  'Students shall view available events.',
                  'Validated',
                ],
                [
                  'FR-002',
                  'Students shall register for events.',
                  'Validated',
                ],
                [
                  'FR-003',
                  'Administrators shall create events.',
                  'Review',
                ],
              ].map(([id, text, status]) => (
                <div
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '55px 1fr 62px',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom:
                      '1px solid #f2f4f7',
                  }}
                >
                  <span
                    style={{
                      color: '#0284c7',
                      fontSize: '9px',
                      fontWeight: 750,
                    }}
                  >
                    {id}
                  </span>

                  <span
                    style={{
                      color: '#475467',
                      fontSize: '10px',
                      lineHeight: 1.45,
                    }}
                  >
                    {text}
                  </span>

                  <span
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderRadius: '5px',
                      background:
                        status === 'Validated'
                          ? '#f0f9ff'
                          : '#fffaeb',
                      color:
                        status === 'Validated'
                          ? '#0369a1'
                          : '#b54708',
                      fontSize: '8px',
                      fontWeight: 700,
                    }}
                  >
                    {status}
                  </span>
                </div>
              ))}

            </div>

            {/* Bottom status */}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '15px',
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
                />
                AI analysis complete
              </div>

              <div
                style={{
                  color: '#0284c7',
                  fontSize: '9px',
                  fontWeight: 650,
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

        @media (max-width: 650px) {
          .hero-preview-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}