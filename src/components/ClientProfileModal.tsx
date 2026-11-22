import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Client } from '../types';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!projectId) {
      queueMicrotask(() => {
        setClientError('No project selected.');
        setClientLoading(false);
      });
      return;
    }

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setClientLoading(true);
        setClientError(null);
        setClientInfo(null);
      }
    });

    api
      .getProjectClient(projectId)
      .then((data) => {
        if (isMounted) {
          setClientInfo(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setClientError(
            error instanceof Error
              ? error.message
              : 'Unable to retrieve client information.'
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setClientLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const sections: Array<{
    title: string;
    icon: string;
    fields: Array<[keyof Client, string]>;
  }> = [
    {
      title: 'CLIENT OVERVIEW',
      icon: '🏢',
      fields: [
        ['client_id', 'Client ID'],
        ['client_name', 'Client Name'],
        ['contact_title', 'Contact Title'],
      ],
    },
    {
      title: 'BUSINESS ADDRESS',
      icon: '📍',
      fields: [
        ['address_line1', 'Address Line 1'],
        ['address_line2', 'Address Line 2'],
        ['city', 'City'],
        ['state_region', 'State / Region'],
        ['postal_code', 'Postal Code'],
        ['country', 'Country'],
      ],
    },
    {
      title: 'CONTACT INFORMATION',
      icon: '☎️',
      fields: [
        ['direct_phone', 'Direct Phone'],
        ['mobile_phone', 'Mobile Phone'],
        ['email', 'Email'],
      ],
    },
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-labelledby="client-profile-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          boxSizing: 'border-box',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            paddingBottom: 16,
            marginBottom: 24,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h2
              id="client-profile-title"
              style={{
                margin: 0,
                fontSize: 21,
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Client Profile
            </h2>
            <p
              style={{
                margin: '5px 0 0',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              Business details and contact information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close client profile"
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: 8,
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {clientLoading && (
          <div
            style={{
              padding: '24px 0',
              color: '#64748b',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Loading client information...
          </div>
        )}

        {/* Error State */}
        {clientError && (
          <div
            role="alert"
            style={{
              padding: 14,
              background: '#fef2f2',
              color: '#b91c1c',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {clientError}
          </div>
        )}

        {/* Client Profile Content */}
        {!clientLoading && !clientError && clientInfo && (
          <>
            {sections.map((section) => (
              <section key={section.title} style={{ marginBottom: 24 }}>
                {/* Section Heading */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#64748b',
                  }}
                >
                  <span>{section.icon}</span>
                  {section.title}
                </div>

                {/* Information Table */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 9,
                    overflow: 'hidden',
                  }}
                >
                  {section.fields.map(([key, label], index) => {
                    const value = clientInfo[key];

                    return (
                      <div
                        key={key as string}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(115px, 35%) minmax(0, 1fr)',
                          background: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                          borderBottom:
                            index < section.fields.length - 1
                              ? '1px solid #e2e8f0'
                              : 'none',
                        }}
                      >
                        {/* Field Label */}
                        <div
                          style={{
                            padding: '11px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                            borderRight: '1px solid #e2e8f0',
                          }}
                        >
                          {label}
                        </div>

                        {/* Read-only Field Value */}
                        <div
                          style={{
                            padding: '11px 14px',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#1e293b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {value === null || value === undefined || value === ''
                            ? '—'
                            : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
