'use client';
import { FC } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import styles from './footer.module.css';

const Footer: FC = () => {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container>
        <Row className="mb-3">
          <Col md={4}>
            <h5 className={styles.footerTitle}>Retro Horror Hub</h5>
            <p className={styles.textContent}>
              Bringing you the best of 80s horror, curated memorabilia, and fan insights.
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
              <a href="mailto:retrohorrorhub@outlook.com" className={styles.link}>
                retrohorrorhub[at]outlook.com
              </a>
            </p>
            <p className={styles.textContent}>
              Follow us on social media for updates and collector highlights.
            </p>
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