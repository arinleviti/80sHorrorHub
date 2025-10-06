"use client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar, Nav, Form, FormControl, Container, Button } from 'react-bootstrap';
import styles from './navbar.module.css';
import { Search } from 'lucide-react';

const NavbarRHH = () => {
  const router = useRouter();
  //React.FormEvent<HTMLFormElement> tells TypeScript:
  //This is a form event (FormEvent) coming from an HTML form element (HTMLFormElement).
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const input = form.elements.namedItem('search') as HTMLInputElement;
    const query = input.value;

    if (query) {
      router.push(`/movies/${encodeURIComponent(query)}`);
    }
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

          <Form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIconInside} size={18} />
              <FormControl
                type="search"
                name="search" // give it a name to access it in the form
                placeholder="Search movies..."
                className={styles.searchInput}
                aria-label="Search"
              />
            </div>
          </Form>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className={styles.toggle} />
        </div>

        {/* Nav links row */}
        <Navbar.Collapse id="basic-navbar-nav" className={styles.collapse}>
          <Nav className={styles.navLinksContainer}>
            <Link href="/movies" className={styles.navLink}>Movies</Link>
            <Link href="/about" className={styles.navLink}>About</Link>
            <Link href="/login">
              <Button className={styles.navButton}>Login</Button>
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarRHH;
