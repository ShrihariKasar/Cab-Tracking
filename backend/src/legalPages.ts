import { env } from './config/env.js';

const LEGAL_BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f5f5f5;
    color: #111111;
    line-height: 1.65;
  }
  header {
    background: #000000;
    color: #ffffff;
    padding: 16px 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  header a { color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; }
  .brand { font-weight: 800; font-size: 18px; }
  .nav { display: flex; gap: 16px; flex-wrap: wrap; }
  main {
    max-width: 860px;
    margin: 24px auto;
    background: #ffffff;
    border-radius: 16px;
    padding: 28px 24px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  h1 { margin-top: 0; font-size: 26px; letter-spacing: -0.4px; }
  h2 { margin-top: 28px; font-size: 18px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
  ul { padding-left: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
  th, td { border: 1px solid #e5e5e5; padding: 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 700; }
  .table-wrap { overflow-x: auto; }
  .meta { font-size: 13px; color: #525252; margin-bottom: 18px; }
  .note { background: #f8fafc; border-left: 4px solid #111111; padding: 12px 14px; border-radius: 6px; font-size: 14px; }
  footer { max-width: 860px; margin: 0 auto 32px; padding: 0 12px; font-size: 13px; color: #525252; text-align: center; }
  @media (max-width: 600px) { main { margin: 12px; padding: 20px 16px; } h1 { font-size: 22px; } }
`;

export function renderPrivacyPolicyHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — ${escapeHtml(env.companyName)}</title>
  <style>${LEGAL_BASE_CSS}</style>
</head>
<body>
  <header>
    <div class="brand">FleetPulse</div>
    <nav class="nav" aria-label="Legal navigation">
      <a href="/driver">Driver Portal</a>
      <a href="/monitor">Admin Monitor</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms-and-conditions">Terms &amp; Conditions</a>
    </nav>
  </header>
  <main>
    <h1>Privacy Policy</h1>
    <p class="meta"><strong>Effective Date:</strong> [CONFIG_REQUIRED: Effective Date] &nbsp;|&nbsp; <strong>Last Updated:</strong> 2026-11-27</p>
    <div class="note">
      <strong>Data Controller:</strong> ${escapeHtml(env.companyName)}<br />
      <strong>Registered Postal Address:</strong> ${escapeHtml(env.companyPostalAddress)}<br />
      <strong>Privacy Contact / Grievance Officer:</strong> [CONFIG_REQUIRED: privacy@your-domain.com &amp; Grievance Officer Name]
    </div>

    <h2>1. Scope of This Policy</h2>
    <p>This Privacy Policy describes how FleetPulse ("we", "our", "us") collects, uses, stores, and protects personal data across the FleetPulse Driver &amp; Admin mobile application and the web portals (<code>/driver</code> and <code>/monitor</code>).</p>

    <h2>2. Personal Data We Collect</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Category</th><th>Data Elements</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>Account &amp; Registration</td><td>Full name, mobile number, password (bcrypt hash), date of birth, account/availability status</td><td>Authentication, role-based access control, and age verification</td></tr>
          <tr><td>Vehicle Assignment</td><td>Vehicle registration number, model, colour</td><td>Fleet dispatch and ride identification</td></tr>
          <tr><td>Location Data</td><td>GPS latitude, longitude, accuracy, timestamps, pickup &amp; destination addresses/coordinates (including background GPS while a ride is active)</td><td>Live fleet monitoring during active rides (<code>START RIDE</code> to <code>END RIDE</code>)</td></tr>
          <tr><td>Consent &amp; Preferences</td><td>DPDP parental/user consent records, verification references, timestamps, analytics/replay opt-in status, email suppression status</td><td>Legal compliance, consent auditability, and honoring user choices</td></tr>
          <tr><td>Push Notifications</td><td>Firebase Cloud Messaging (FCM) device token (if enabled)</td><td>Dispatch alerts to fleet administrators when rides start/end</td></tr>
        </tbody>
      </table>
    </div>
    <p>We do <strong>not</strong> collect payment card data, contacts, camera, or microphone streams.</p>

    <h2>3. Lawful Bases &amp; Consent Management</h2>
    <ul>
      <li><strong>Contract / Operational Necessity:</strong> Authenticating authorized drivers and administrators and transmitting live ride coordinates during active dispatch.</li>
      <li><strong>Explicit Consent:</strong> Optional non-essential analytics and session replay are <strong>disabled by default</strong> and never run unless you explicitly opt in via Privacy Preferences. Under-18 driver registration requires server-verified parental/guardian consent before account activation.</li>
    </ul>

    <h2>4. Third-Party Service Providers &amp; International Transfers</h2>
    <ul>
      <li><strong>Google Maps SDK / Esri World Street Map / Leaflet CDN (<code>unpkg.com</code>):</strong> Displays interactive maps and map tiles; receives device IP address and viewport coordinates.</li>
      <li><strong>OpenStreetMap Nominatim &amp; OSRM (<code>router.project-osrm.org</code>):</strong> Resolves place search queries and driving route geometry between pickup and destination coordinates.</li>
      <li><strong>Firebase Cloud Messaging (when configured):</strong> Delivers ride-status push notifications to administrators.</li>
    </ul>

    <h2>5. Data Retention &amp; Security Measures</h2>
    <p>Passwords and parental verification codes are hashed using bcrypt. Authentication tokens are stored in OS Keychain/Keystore on mobile devices and transmitted over HTTPS/WSS in production. Retention periods: [CONFIG_REQUIRED: Define exact retention schedule in days/years for ride_location_history and closed accounts].</p>

    <h2>6. Your Privacy Rights</h2>
    <p>Depending on your jurisdiction (including India DPDP Act, EU/UK GDPR, and California CCPA/CPRA), you may request:</p>
    <ul>
      <li><strong>Access / Export:</strong> Authenticated drivers can export their personal data via <code>GET /api/compliance/my-data</code>.</li>
      <li><strong>Correction:</strong> Update profile details via the Driver Profile screen or <code>PATCH /api/drivers/:id</code>.</li>
      <li><strong>Consent Withdrawal:</strong> Withdraw DPDP consent in Profile Settings or via <code>POST /api/compliance/consent/withdraw</code>.</li>
      <li><strong>Account &amp; Data Deletion:</strong> Delete your account and associated location history via Profile Settings or <code>DELETE /api/compliance/account</code>.</li>
      <li><strong>Marketing Unsubscribe:</strong> Every promotional email includes a one-click unsubscribe link (<code>/api/compliance/unsubscribe</code>) requiring no login or fee.</li>
    </ul>

    <h2>7. Children's Privacy</h2>
    <p>Individuals under 18 years of age cannot activate an account without verifiable parental/guardian consent enforced on the server.</p>

    <h2>8. Changes to This Policy</h2>
    <p>We may update this Privacy Policy as legal or operational requirements change. Material updates will update the "Last Updated" date above.</p>
  </main>
  <footer>&copy; ${new Date().getUTCFullYear()} ${escapeHtml(env.companyName)} • <a href="/terms-and-conditions">Terms &amp; Conditions</a></footer>
</body>
</html>`;
}

export function renderTermsHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms &amp; Conditions — ${escapeHtml(env.companyName)}</title>
  <style>${LEGAL_BASE_CSS}</style>
</head>
<body>
  <header>
    <div class="brand">FleetPulse</div>
    <nav class="nav" aria-label="Legal navigation">
      <a href="/driver">Driver Portal</a>
      <a href="/monitor">Admin Monitor</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms-and-conditions">Terms &amp; Conditions</a>
    </nav>
  </header>
  <main>
    <h1>Terms &amp; Conditions</h1>
    <p class="meta"><strong>Effective Date:</strong> [CONFIG_REQUIRED: Effective Date] &nbsp;|&nbsp; <strong>Last Updated:</strong> 2026-11-27</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using FleetPulse (${escapeHtml(env.companyName)}), you agree to these Terms &amp; Conditions and our <a href="/privacy-policy">Privacy Policy</a>.</p>

    <h2>2. Eligibility &amp; Age Requirements</h2>
    <p>You must be legally authorized to operate as a fleet driver or administrator. Users under 18 years of age may only register with verifiable parental or guardian consent.</p>

    <h2>3. Account Security &amp; Responsibilities</h2>
    <ul>
      <li>You are responsible for safeguarding your login credentials and device access.</li>
      <li>You must provide accurate registration, date-of-birth, and vehicle information.</li>
      <li>Do not share credentials, spoof GPS coordinates, or attempt to bypass authentication or consent controls.</li>
    </ul>

    <h2>4. Acceptable Use &amp; Prohibited Activities</h2>
    <p>You may use FleetPulse strictly for authorized fleet dispatch and ride tracking. Automated scraping, brute-force attacks, unauthorized access to other drivers' records, or interference with service availability is strictly prohibited.</p>

    <h2>5. Service Availability &amp; Third-Party Services</h2>
    <p>Live GPS tracking depends on device hardware, cellular/Wi-Fi connectivity, and third-party mapping/routing providers (Google Maps, Esri, OpenStreetMap Nominatim, OSRM). We do not guarantee uninterrupted availability.</p>

    <h2>6. Account Suspension &amp; Deletion</h2>
    <p>We may suspend accounts that violate these Terms or when DPDP consent is withdrawn. Drivers may delete their accounts at any time through Profile Settings or <code>DELETE /api/compliance/account</code>.</p>

    <h2>7. Limitation of Liability &amp; Governing Law</h2>
    <p>To the maximum extent permitted by applicable law (and without limiting mandatory consumer or data-protection rights), FleetPulse is provided "as is". Governing Law &amp; Jurisdiction: [CONFIG_REQUIRED: Governing Law &amp; Venue].</p>

    <h2>8. Contact Information</h2>
    <p>${escapeHtml(env.companyName)}<br />${escapeHtml(env.companyPostalAddress)}<br />Support / Legal Contact: [CONFIG_REQUIRED: legal@your-domain.com]</p>
  </main>
  <footer>&copy; ${new Date().getUTCFullYear()} ${escapeHtml(env.companyName)} • <a href="/privacy-policy">Privacy Policy</a></footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
