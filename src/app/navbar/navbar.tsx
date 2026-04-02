"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import styles from './navbar.module.css';
import { Search } from 'lucide-react';
import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { moviesArray } from '@/app/services/movies';

const fuse = new Fuse(moviesArray, {
  keys: ['slug', 'title'],
  threshold: 0.4,
  getFn: (obj, path) => (path === 'slug' ? obj.slug : obj.title),
});

const NavbarRHH = () => {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ slug: string; id: number; title: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSwitchAccount = async () => {
    await signOut({ redirect: false });
    window.location.href = "/api/auth/signin/google?prompt=select_account";
  };

  return (
    <Navbar expand="lg" className={styles.navbar}>
      <Container className={styles.container}>

        {/* Top row: Logo + Search + Hamburger */}
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
          <div className={styles.searchForm} ref={dropdownRef} style={{ position: 'relative' }}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIconInside} size={18} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search && setShowDropdown(true)}
                placeholder="SEARCH"
                className={styles.searchInput}
                aria-label="Search"
              />
            </div>

            {showDropdown && results.length > 0 && (
              <div className={styles.searchDropdown}>
                {results.map((r) => (
                  <Link // <--- Add the tag name here
                    key={r.slug}
                    href={`/movies/${r.slug}`}
                    className={styles.searchItem}
                    onClick={() => {
                      setShowDropdown(false);
                      setSearch('');
                    }}
                  >
                    {r.title}
                  </Link> // <--- Use </Link> to match
                ))}
              </div>
            )}

            {showDropdown && results.length === 0 && (
              <div className={styles.noResults}>No results found</div>
            )}
          </div>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className={styles.toggle} />
        </div>

        {/* Nav links */}
        <Navbar.Collapse id="basic-navbar-nav" className={styles.collapse}>
          <Nav className={styles.navLinksContainer}>
            <Link href="/about" className={styles.navLink}>ABOUT</Link>

            {session ? (
              <>
                <span className={styles.userInfo}>{session.user?.email}</span>
                <Button className={styles.navButton} onClick={() => signOut()}>
                  LOG OUT
                </Button>
                <Button className={styles.navButton} onClick={handleSwitchAccount}>
                  SWITCH ACCOUNT
                </Button>
              </>
            ) : (
              <Button className={styles.navButton} onClick={() => signIn("google")}>
                LOG IN
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>

      </Container>
    </Navbar>
  );
};

export default NavbarRHH;