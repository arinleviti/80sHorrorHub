"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar, Nav, Form, FormControl, Button, Container } from 'react-bootstrap';
import styles from './navbar.module.css';

const NavbarRHH = () => {
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Searching for:', search);
  };

  return (
    <Navbar expand="lg" className={styles.navbar}>
  <Container className={styles.container}>
    <Link href="/" className={styles.logoLink}>
      <Image
        src="/static_imgs/RHH_def_beta.webp"
        alt="RHH Logo"
        width={100}
        height={100}
        className={styles.logo}
      />
    </Link>

    <Navbar.Toggle aria-controls="basic-navbar-nav" className={styles.toggle} />

    <Navbar.Collapse id="basic-navbar-nav" className={styles.collapse}>
      <Nav className={styles.navLinksContainer}>
        <Link href="/" className={styles.navLink}>Home</Link>
        <Link href="/movies" className={styles.navLink}>Movies</Link>
        <Link href="/about" className={styles.navLink}>About</Link>
      </Nav>

      <Form className={styles.searchForm} onSubmit={handleSearch}>
        <FormControl
          type="search"
          placeholder="Search movies..."
          className={styles.searchInput}
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button className={styles.navButton} type="submit">Search</Button>
        <Link href="/login">
          <Button className={styles.navButton}>Login</Button>
        </Link>
      </Form>
    </Navbar.Collapse>
  </Container>
</Navbar>

  );
};

export default NavbarRHH;
