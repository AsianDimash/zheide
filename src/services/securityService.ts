import { supabase } from './supabaseClient';

export interface AttackDescriptor {
  id: string;
  name: string;
  description: string;
  likelihood: number; // 0-1
  confidence: number; // 0-1 how confident the assessment is
  remediation: string[];
}

/**
 * Basic heuristic assessment function.
 * Returns a list of common web attacks with an estimated likelihood and remediation notes.
 * The function accepts an optional `hints` object you can use to increase/decrease likelihoods
 * based on what you know about your deployment (for example, whether anon keys are exposed).
 */
export function assessSiteRisks(hints?: {
  publicAnonKeyExposed?: boolean;
  usesExternalScripts?: boolean;
  corsAllowAll?: boolean;
  rateLimitingEnabled?: boolean;
  authEnabled?: boolean;
}): AttackDescriptor[] {
  const h = hints || {};

  // baseline probabilities (conservative defaults)
  const risks: AttackDescriptor[] = [
    {
      id: 'xss',
      name: 'Cross-Site Scripting (XSS)',
      description: 'An attacker injects JS into pages viewed by other users, stealing cookies or performing actions on behalf of users.',
      likelihood: 0.25 + (h.usesExternalScripts ? 0.15 : 0),
      confidence: 0.6,
      remediation: [
        'Escape or sanitize any user-generated HTML before inserting it into the DOM.',
        'Avoid using innerHTML or dangerouslySetInnerHTML. If you must, sanitize inputs with a vetted library.',
        'Use Content Security Policy (CSP) to reduce impact.'
      ]
    },

    {
      id: 'csrf',
      name: 'Cross-Site Request Forgery (CSRF)',
      description: 'A malicious site tricks an authenticated user into submitting requests to your site.',
      likelihood: h.authEnabled ? 0.15 : 0.05,
      confidence: 0.5,
      remediation: [
        'Use SameSite=strict cookies or anti-CSRF tokens for state-changing requests.',
        'Prefer authorization headers (Bearer tokens) over cookies when possible.'
      ]
    },

    {
      id: 'sql_injection',
      name: 'SQL Injection / Query Injection',
      description: 'User input is directly embedded into SQL queries and an attacker manipulates the query.',
      likelihood: 0.05,
      confidence: 0.5,
      remediation: [
        'Use parameterized queries / query builders.',
        'Validate and sanitize inputs on the server side.',
        'Use least-privileged DB roles for application connections.'
      ]
    },

    {
      id: 'sensitive_data_exposure',
      name: 'Sensitive Data Exposure (exposed keys, secrets)',
      description: 'Secrets or keys embedded in the frontend or accessible endpoints can be abused by attackers.',
      likelihood: h.publicAnonKeyExposed ? 0.9 : 0.2,
      confidence: h.publicAnonKeyExposed ? 0.9 : 0.4,
      remediation: [
        'Do not embed secret or service_role keys in the client bundle.',
        'Store secrets in server-side environment variables and use server endpoints to perform privileged actions.',
        'Rotate keys regularly.'
      ]
    },
    {
      id: 'phishing',
      name: 'Phishing / Social Engineering',
      description: 'Attackers trick users into revealing credentials or clicking malicious links (often via email or fake pages).',
      likelihood: h.publicAnonKeyExposed ? 0.4 : 0.25,
      confidence: 0.5,
      remediation: [
        'Educate users about phishing and suspicious links.',
        'Use email sender protection (SPF, DKIM, DMARC).',
        'Monitor for lookalike domains and block them.'
      ]
    },

    {
      id: 'dos',
      name: 'Denial of Service (DoS) / Rate abuse',
      description: 'High traffic or abusive bots overwhelm your application or external APIs.',
      likelihood: h.rateLimitingEnabled ? 0.05 : 0.3,
      confidence: 0.5,
      remediation: [
        'Implement rate limiting, request throttling, and CAPTCHAs for abuse-prone endpoints.',
        'Use caching and CDNs to reduce load.',
        'Monitor traffic patterns and set alerts.'
      ]
    },

    {
      id: 'cors_misconfig',
      name: 'CORS Misconfiguration',
      description: 'Overly permissive CORS (e.g., Access-Control-Allow-Origin: *) can expose APIs to rogue origins.',
      likelihood: h.corsAllowAll ? 0.7 : 0.15,
      confidence: 0.6,
      remediation: [
        'Restrict allowed origins to explicit hostnames you control.',
        'Use proper authentication and do not rely solely on CORS for protection.'
      ]
    },

    {
      id: 'oauth_abuse',
      name: 'OAuth/OpenID Abuse',
      description: 'Improperly configured OAuth flows can lead to account takeover or leaked tokens.',
      likelihood: h.authEnabled ? 0.12 : 0.03,
      confidence: 0.5,
      remediation: [
        'Validate OAuth redirect URIs.',
        'Use PKCE for public clients when supported.',
        'Monitor for suspicious token usage.'
      ]
    }
  ];

  // clamp likelihoods between 0 and 1
  risks.forEach(r => {
    r.likelihood = Math.max(0, Math.min(1, r.likelihood));
    r.confidence = Math.max(0, Math.min(1, r.confidence));
  });

  return risks;
}

export interface SecurityEvent {
  event_type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  source_ip?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Record a security event to Supabase `security_events` table.
 * The table must exist in the database (see migrations/create_security_events.sql).
 */
export async function recordAttack(event: SecurityEvent) {
  try {
    const toInsert = {
      event_type: event.event_type,
      severity: event.severity || 'medium',
      details: event.details || null,
      source_ip: event.source_ip || null,
      metadata: event.metadata || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('security_events').insert([toInsert]);
    if (error) {
      console.error('Failed to record security event:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (err) {
    console.error('Unexpected error recording security event:', err);
    return { ok: false, error: err };
  }
}
