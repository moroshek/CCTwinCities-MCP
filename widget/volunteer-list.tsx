import React, { useState, useEffect, useSyncExternalStore } from 'react';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  location: {
    city: string;
    facility: string;
    address: string | null;
  };
  schedule: {
    type: string;
    details: string;
  };
  requirements: {
    age_minimum: number;
    background_check: boolean | null;
    skills: string[];
    group_friendly: boolean;
    max_group_size: number | null;
  };
  contact: {
    phone: string;
    email: string;
  };
  signup_url: string | null;
  source_url: string;
}

interface ToolOutput {
  opportunities: Opportunity[];
  contact: {
    phone: string;
    email: string;
    web_form_url: string;
  };
}

interface OpenAIGlobal {
  toolOutput: ToolOutput;
  sendFollowUpMessage: (message: string) => void;
  openUrl: (url: string) => void;
  callTool: (toolName: string, params: any) => Promise<any>;
  setWidgetState: (state: any) => void;
  widgetState: any;
  displayMode: 'inline' | 'fullscreen' | 'pip';
  maxHeight: number;
}

declare global {
  interface Window {
    openai: OpenAIGlobal;
  }
}

// Custom hook to subscribe to window.openai global state
function useOpenAiGlobal<K extends keyof OpenAIGlobal>(key: K): OpenAIGlobal[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = () => onChange();
      window.addEventListener('openai:setGlobal', handleSetGlobal);
      return () => window.removeEventListener('openai:setGlobal', handleSetGlobal);
    },
    () => window.openai?.[key],
    () => undefined
  );
}

export default function VolunteerList() {
  const [data, setData] = useState<ToolOutput | null>(null);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterSchedule, setFilterSchedule] = useState<string>('');
  const displayMode = useOpenAiGlobal('displayMode') || 'inline';

  useEffect(() => {
    if (window.openai && window.openai.toolOutput) {
      setData(window.openai.toolOutput);

      // Restore filter state if available
      if (window.openai.widgetState) {
        setFilterCity(window.openai.widgetState.filterCity || '');
        setFilterSchedule(window.openai.widgetState.filterSchedule || '');
      }
    }
  }, []);

  // Save filter state
  useEffect(() => {
    if (window.openai?.setWidgetState) {
      window.openai.setWidgetState({ filterCity, filterSchedule });
    }
  }, [filterCity, filterSchedule]);

  if (!data) {
    return <div style={{ padding: '16px' }}>Loading opportunities...</div>;
  }

  const { opportunities, contact } = data;

  // Apply local filters
  let filteredOpps = opportunities;
  if (filterCity) {
    filteredOpps = filteredOpps.filter(opp =>
      opp.location.city.toLowerCase().includes(filterCity.toLowerCase())
    );
  }
  if (filterSchedule) {
    filteredOpps = filteredOpps.filter(opp =>
      opp.schedule.type === filterSchedule
    );
  }

  const handleRefreshWithFilters = async () => {
    if (window.openai?.callTool) {
      try {
        await window.openai.callTool('get_volunteer_opportunities', {
          city: filterCity || undefined,
          schedule_type: filterSchedule || undefined,
        });
      } catch (error) {
        console.error('Failed to call tool:', error);
      }
    }
  };

  const handleAskAboutOpportunity = (opp: Opportunity) => {
    if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage(
        `Tell me more about the "${opp.title}" volunteer opportunity`
      );
    }
  };

  const handleShowDonations = () => {
    if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage(
        `Show me donation options for Catholic Charities Twin Cities`
      );
    }
  };

  const isFullscreen = displayMode === 'fullscreen';

  if (filteredOpps.length === 0 && (filterCity || filterSchedule)) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>No opportunities match your filters.</p>
        <button
          onClick={() => {
            setFilterCity('');
            setFilterSchedule('');
          }}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#fff',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '12px'
          }}
        >
          Clear Filters
        </button>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>No opportunities found.</p>
        <p style={{ fontSize: '14px', marginTop: '12px' }}>
          Contact: <a href={`mailto:${contact.email}`}>{contact.email}</a> | {contact.phone}
        </p>
      </div>
    );
  }

  const cities = Array.from(new Set(opportunities.map(o => o.location.city))).sort();
  const scheduleTypes = Array.from(new Set(opportunities.map(o => o.schedule.type))).sort();

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: isFullscreen ? '24px' : '8px',
      maxWidth: '100%',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
            City
          </label>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
            Schedule
          </label>
          <select
            value={filterSchedule}
            onChange={(e) => setFilterSchedule(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Schedules</option>
            {scheduleTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {(filterCity || filterSchedule) && (
          <button
            onClick={() => {
              setFilterCity('');
              setFilterSchedule('');
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              alignSelf: 'flex-end'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Opportunities List */}
      <div style={{
        display: 'grid',
        gap: '12px',
        gridTemplateColumns: isFullscreen ? 'repeat(auto-fill, minmax(400px, 1fr))' : '1fr'
      }}>
        {filteredOpps.map((opp) => (
          <div
            key={opp.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#fff',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {opp.title}
            </h3>

            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              {opp.description}
            </p>

            <div style={{
              display: 'grid',
              gap: '8px',
              fontSize: '13px',
              marginBottom: '12px'
            }}>
              <div>
                <strong>📍 Location:</strong> {opp.location.city}
                {opp.location.facility && opp.location.facility !== 'Various locations' &&
                  ` • ${opp.location.facility}`}
              </div>

              <div>
                <strong>🕐 Schedule:</strong> {opp.schedule.details}
              </div>

              <div>
                <strong>👤 Requirements:</strong> Age {opp.requirements.age_minimum}+
                {opp.requirements.group_friendly &&
                  ` • Group-friendly (max ${opp.requirements.max_group_size || 'varies'})`}
                {opp.requirements.skills.length > 0 &&
                  ` • Skills: ${opp.requirements.skills.join(', ')}`}
              </div>

              <div>
                <strong>📞 Contact:</strong>{' '}
                <a
                  href={`mailto:${opp.contact.email}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.openai?.openUrl) {
                      window.openai.openUrl(`mailto:${opp.contact.email}?subject=Volunteer Inquiry: ${encodeURIComponent(opp.title)}`);
                    }
                  }}
                  style={{ color: '#2563eb', textDecoration: 'none', cursor: 'pointer' }}
                >
                  {opp.contact.email}
                </a>
                {' | '}
                <a
                  href={`tel:${opp.contact.phone}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.openai?.openUrl) {
                      window.openai.openUrl(`tel:${opp.contact.phone}`);
                    }
                  }}
                  style={{ color: '#2563eb', textDecoration: 'none', cursor: 'pointer' }}
                >
                  {opp.contact.phone}
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {opp.signup_url && (
                <button
                  onClick={() => window.openai?.openUrl(opp.signup_url!)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#fff',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Sign Up
                </button>
              )}
              <button
                onClick={() => {
                  const mailto = `mailto:${opp.contact.email}?subject=Volunteer Inquiry: ${encodeURIComponent(opp.title)}`;
                  window.openai?.openUrl(mailto);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Email
              </button>
              <button
                onClick={() => handleAskAboutOpportunity(opp)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Ask More
              </button>
              {opp.source_url && (
                <button
                  onClick={() => window.openai?.openUrl(opp.source_url)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Learn More
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '16px 12px',
        fontSize: '13px',
        color: '#6b7280',
        borderTop: '1px solid #e5e7eb',
        marginTop: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <p style={{ margin: '0 0 12px 0' }}>
          <strong>General volunteer inquiries:</strong>
        </p>
        <p style={{ margin: '0 0 12px 0' }}>
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => {
              e.preventDefault();
              window.openai?.openUrl(`mailto:${contact.email}`);
            }}
            style={{ color: '#2563eb', cursor: 'pointer' }}
          >
            {contact.email}
          </a>
          {' | '}
          <a
            href={`tel:${contact.phone}`}
            onClick={(e) => {
              e.preventDefault();
              window.openai?.openUrl(`tel:${contact.phone}`);
            }}
            style={{ color: '#2563eb', cursor: 'pointer' }}
          >
            {contact.phone}
          </a>
          {' | '}
          <a
            href={contact.web_form_url}
            onClick={(e) => {
              e.preventDefault();
              window.openai?.openUrl(contact.web_form_url);
            }}
            style={{ color: '#2563eb', cursor: 'pointer' }}
          >
            Visit Website
          </a>
        </p>
        <button
          onClick={handleShowDonations}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#fff',
            backgroundColor: '#059669',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          💝 How to Donate
        </button>
      </div>
    </div>
  );
}
