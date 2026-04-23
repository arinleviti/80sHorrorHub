'use client';
import { FC } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import styles from './footer.module.css';
import { FaInstagram } from 'react-icons/fa';

const Footer: FC = () => {
  const currentYear: number = new Date().getFullYear();
 
  return (
    <footer className={styles.footer}>
      <Container>
        <Row className="mb-3">
          <Col md={4}>
            <h5 className={styles.footerTitle}>Retro Horror Hub</h5>
            <p className={styles.textContent}>
              Bringing you the best of retro horror, curated memorabilia, and fan insights.
            </p>
        <p className={styles.textContent}>
              <a href="/AboutPage" className={styles.link}>About</a>
              {' · '}
              <a href="/privacy" className={styles.link}>Privacy Policy</a>
            </p>
          </Col>

          <Col md={4}>
            <h5 className={styles.footerTitle}>Legal & Credits</h5>
            <p className={styles.textContent}>
              Movie posters and cast images provided by{' '}
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                TMDb
              </a>
              .
            </p>
            <p className={styles.textContent}>
              All content is for informational and entertainment purposes only. Retro Horror Hub is not responsible for any claims, damages, or copyright violations.
            </p>
          </Col>

          <Col md={4}>
            <h5 className={styles.footerTitle}>Contact</h5>
            <p className={styles.textContent}>
              Email:{' '}
              <a href="mailto:retrohorrorhub@gmail.com" className={styles.link}>
                retrohorrorhub[at]gmail.com
              </a>
            </p>
            <a href="https://www.instagram.com/retrohorrorhub/" target="_blank" rel="noopener noreferrer">
              <FaInstagram size={25} color="var(--color-primary)" />
            </a>
          </Col>
        </Row>

        <Row className="pt-2 border-top">
          <Col className="text-center text-muted-custom">
            &copy; 2026-{currentYear} Retro Horror Hub. All rights reserved.
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;