"use client";
import Link from "next/link";
import Image from "next/image";
import { Navbar, Nav, Container, Button, Modal } from "react-bootstrap";
import styles from "./navbar.module.css";
import { Search } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { moviesArray } from "@/app/services/movies";

const fuse = new Fuse(moviesArray, {
  keys: ["slug", "title"],
  threshold: 0.4,
  getFn: (obj, path) => (path === "slug" ? obj.slug : obj.title),
});

const NavbarRHH = () => {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ slug: string; id: number; title: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showGoogleConsent, setShowGoogleConsent] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentNewsletter, setConsentNewsletter] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search logic
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const fuseResults = fuse.search(search.trim());
    setResults(fuseResults.map((r) => ({ ...r.item })));
    setShowDropdown(true);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Email login handler
  const handleEmailLogin = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Please enter both name and email.");
      return;
    }
    if (!consentPrivacy) {
      alert("You must agree to the Privacy Policy to log in.");
      return;
    }

    try {
      const preRes = await fetch("/api/auth/pre-sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, consentPrivacy, consentNewsletter }),
      });
      if (!preRes.ok) throw new Error("Could not save user info.");

      const result = await signIn("email", {
        email: email.toLowerCase().trim(),
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) alert("Error: " + result.error);
      else {
        alert("Check your inbox for the magic login link! 👻");
        setEmail("");
        setName("");
        setShowEmailModal(false);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  };

  // Google login handler
  const handleGoogleLogin = async () => {
    if (!consentPrivacy) {
      setShowGoogleConsent(true);
      return;
    }
    const result = await signIn("google", { redirect: false, callbackUrl: "/" });
    if (result?.error) alert("Login blocked: Please accept the Privacy Policy first.");
  };

  // Google consent submit handler
  const handleGoogleConsentSubmit = async () => {
    if (!consentPrivacy) {
      alert("You must agree to the Privacy Policy to continue.");
      return;
    }
    setShowGoogleConsent(false);
    const result = await signIn("google", { redirect: false, callbackUrl: "/" });
    if (result?.error) alert("Login blocked: Please accept the Privacy Policy first.");
  };

  // Load consent from session
  useEffect(() => {
    if (session?.user) {
      setConsentPrivacy(session.user.consentPrivacy);
      setConsentNewsletter(session.user.consentNewsletter);
    }
  }, [session]);

  return (
    <>
      <Navbar expand="lg" className={styles.navbar}>
        <Container className={styles.container}>
          {/* Top row: Logo + Search */}
          <div className={styles.topRow}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/static_imgs/RHH_def_beta.webp"
                alt="RHH Logo"
                width={100}
                height={100}
                className={styles.logo}
              />
            </Link>

            {/* Search */}
            <div className={styles.searchForm} ref={dropdownRef} style={{ position: "relative" }}>
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIconInside} size={18} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => search && setShowDropdown(true)}
                  placeholder="SEARCH"
                  className={styles.searchInput}
                />
              </div>
              {showDropdown && results.length > 0 && (
                <div className={styles.searchDropdown}>
                  {results.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/movies/${r.slug}`}
                      className={styles.searchItem}
                      onClick={() => {
                        setShowDropdown(false);
                        setSearch("");
                      }}
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              )}
              {showDropdown && results.length === 0 && <div className={styles.noResults}>No results found</div>}
            </div>

            <Navbar.Toggle aria-controls="basic-navbar-nav" className={styles.toggle} />
          </div>

          {/* Nav links */}
          <Navbar.Collapse id="basic-navbar-nav" className={styles.collapse}>
            <Nav className={styles.navLinksContainer}>
              <Link href="/about" className={styles.navLink}>
                ABOUT
              </Link>

              {session ? (
                <>
                  <span className={styles.userInfo}>{session.user?.name}</span>
                  <Button className={styles.navButton} onClick={() => signOut()}>
                    LOG OUT
                  </Button>
                </>
              ) : (
                <>
                  <Button className={styles.navButton} onClick={handleGoogleLogin}>
                    LOG IN WITH GOOGLE
                  </Button>
                  <Button className={styles.navButton} onClick={() => setShowEmailModal(true)}>
                    LOG IN WITH EMAIL
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* --- Email Login Modal --- */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)} centered className={styles.modalWrapper} contentClassName={styles.modalContent}>
        <Modal.Header closeButton>
          <Modal.Title className={styles.modalTitle}>Email Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={styles.modalInput} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={styles.modalInput} />
          <label className={styles.modalLabel}>
            <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} /> I agree to the{" "}
            <a href="/privacy" target="_blank">
              Privacy Policy
            </a>{" "}
            (required)
          </label>
          <label className={styles.modalLabel}>
            <input type="checkbox" checked={consentNewsletter} onChange={(e) => setConsentNewsletter(e.target.checked)} /> I want to receive newsletters and updates (optional)
          </label>
        </Modal.Body>
        <Modal.Footer>
          <Button className={styles.modalButton} onClick={handleEmailLogin}>
            Send Link
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Google Consent Modal --- */}
      <Modal show={showGoogleConsent} onHide={() => setShowGoogleConsent(false)} centered className={styles.modalWrapper}>
        <Modal.Header closeButton>
          <Modal.Title className={styles.modalTitle}>Google Login Consent</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className={styles.modalLabel}>
            <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} /> I agree to the{" "}
            <a href="/privacy" target="_blank">
              Privacy Policy
            </a>{" "}
            (required)
          </label>
          <label className={styles.modalLabel}>
            <input type="checkbox" checked={consentNewsletter} onChange={(e) => setConsentNewsletter(e.target.checked)} /> I want to receive newsletters and updates (optional)
          </label>
        </Modal.Body>
        <Modal.Footer>
          <Button className={styles.modalButton} onClick={handleGoogleConsentSubmit}>
            Continue with Google
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NavbarRHH;