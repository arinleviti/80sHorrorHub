import { Container, Button } from "react-bootstrap";
import CloseTabButton from "./closeTabButton";
export default function PrivacyPage() {
  
  return (
    <Container style={{ maxWidth: "800px", padding: "40px 20px", lineHeight: "1.7" }}>
      
    

      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> April 2026</p>

      <h2 className="mt-4">1. Who We Are</h2>
      <p>
        Retro Horror Hub is an independent web project operated by an individual based in Italy.
      </p>
      <p>
        Contact: <strong>retrohorrorhub@gmail.com</strong>
      </p>

      <h2 className="mt-4">2. What Data We Collect</h2>

      <h3 className="mt-3">Account Information</h3>
      <ul>
        <li>Name (if provided)</li>
        <li>Email address</li>
      </ul>

      <h3 className="mt-3">Authentication Data</h3>
      <ul>
        <li>Email login (magic link)</li>
        <li>Google login (OAuth)</li>
      </ul>

      <h3 className="mt-3">Usage Data</h3>
      <ul>
        <li>Browser type, device, and general interaction data (analytics)</li>
      </ul>

      <h2 className="mt-4">3. How We Use Your Data</h2>
      <ul>
        <li>Create and manage your account</li>
        <li>Allow secure login</li>
        <li>Enable contributions to the platform</li>
        <li>Improve the website and user experience</li>
        <li>Send newsletters or updates (only if you opt in)</li>
      </ul>

      <h2 className="mt-4">4. Legal Basis for Processing</h2>
      <p>
        We process your data based on:
      </p>
      <ul>
        <li><strong>Consent</strong> — when you accept this Privacy Policy</li>
        <li><strong>Legitimate interest</strong> — for essential platform functionality and security</li>
      </ul>

      <h2 className="mt-4">5. Third-Party Services</h2>

      <h3 className="mt-3">Authentication</h3>
      <ul>
        <li>Google (OAuth login)</li>
      </ul>

      <h3 className="mt-3">Hosting</h3>
      <ul>
        <li>Netlify</li>
      </ul>

      <h3 className="mt-3">Database</h3>
      <ul>
        <li>Supabase (data stored in the United States, Ohio)</li>
      </ul>

      <h3 className="mt-3">Analytics</h3>
      <ul>
        <li>Analytics tools to understand usage and improve the platform</li>
      </ul>

      <p>
        These providers may process your data according to their own privacy policies.
      </p>

      <h2 className="mt-4">6. Cookies</h2>
      <p>
        We use cookies and similar technologies to:
      </p>
      <ul>
        <li>Keep you logged in</li>
        <li>Ensure the website functions correctly</li>
        <li>Analyze usage and performance</li>
      </ul>

      <p>
        You will be asked to manage cookie preferences via a cookie banner where required.
      </p>

      <h2 className="mt-4">7. Data Storage and Retention</h2>
      <ul>
        <li>Your data is stored securely using Supabase infrastructure</li>
        <li>Data is stored in the United States (Ohio)</li>
        <li>We retain your data as long as your account is active</li>
        <li>You may request deletion at any time</li>
      </ul>

      <h2 className="mt-4">8. International Data Transfers</h2>
      <p>
        Your data may be transferred and processed outside the European Union,
        including in the United States. We take appropriate safeguards to ensure
        your data is protected in accordance with applicable laws.
      </p>

      <h2 className="mt-4">9. Your Rights</h2>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Withdraw consent at any time</li>
        <li>Request restriction or portability of your data</li>
      </ul>

      <p>
        To exercise your rights, contact: <strong>retrohorrorhub@gmail.com</strong>
      </p>

      <h2 className="mt-4">10. Newsletter and Communications</h2>
      <p>
        If you opt in, we may send occasional emails about updates, features, or content.
        You can unsubscribe at any time.
      </p>

      <h2 className="mt-4">11. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your data
        against unauthorized access, loss, or misuse.
      </p>

      <h2 className="mt-4">12. Changes to This Policy</h2>
      <p>
        This Privacy Policy may be updated from time to time. Updates will be posted on this page
        with a revised date.
      </p>

      <h2 className="mt-4">13. Contact</h2>
      <p>
        For any privacy-related questions or requests:
        <br />
        <strong>retrohorrorhub@gmail.com</strong>
      </p>

    </Container>
  );
}