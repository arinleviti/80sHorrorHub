import { Container } from "react-bootstrap";
import CloseTabButton from "../privacy/closeTabButton";

export default function AboutPage() {
  return (
    <Container style={{ maxWidth: "800px", padding: "40px 20px", lineHeight: "1.7" }}>

     

      <h1>About Retro Horror Hub</h1>

      <p className="mt-4">
        Retro Horror Hub is a space for people who already love these films.
      </p>

      <p>
        This isn`&apos;`t about reviews, ratings, or deciding what to watch next. If you`&apos;`re here,
        chances are you already know the movie—you`&apos;`ve seen it, you remember it, and you care
        about it. The goal is simple: go deeper.
      </p>

      <p>
        This project is still in its early stages, and it`&apos;`s being built and curated by one
        person. New movies are being added every day, so the hub is constantly evolving. What
        you see is a mix of structured data and custom systems designed to surface the most
        interesting and relevant content around each film—whether that`&apos;`s rare collectibles,
        standout videos, or hard-to-find details.
      </p>

      <p>
        The platform uses algorithms to filter and prioritize quality over noise, but it`&apos;`s not
        just about pulling data from APIs. The real ambition goes beyond that.
      </p>

      <p>
        Over time, the hub aims to become a curated, fan-driven knowledge base. Not comments,
        not generic reviews—but meaningful contributions: behind-the-scenes facts, personal
        insights, obscure trivia, and anything that adds real value.
      </p>

      <p>
        If you create an account, you`&apos;`ll be able to contribute. Submissions are reviewed to
        keep the quality high, with the long-term vision of building something shaped by fans
        who genuinely care.
      </p>

      <p>
        This is a work in progress, and feedback is not just welcome—it`&apos;`s essential.
      </p>

      <h2 className="mt-4">Affiliate Disclosure</h2>
      <p>
        Some links on this site may be affiliate links, including links to eBay and other
        retailers. This means we may earn a small commission if you make a purchase through
        one of these links, at no extra cost to you. Affiliate income helps keep the site
        running and free to use.
      </p>
      <p>
        We only link to products and collectibles that are genuinely relevant to the content
        on this site. Affiliate relationships do not influence editorial content.
      </p>

      <h2 className="mt-4">Credits</h2>
      <p>
        Movie posters, cast images, and film metadata are provided by{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          TMDb (The Movie Database)
        </a>
        . All content on this site is for informational and entertainment purposes only.
      </p>

      <h2 className="mt-4">Contact</h2>
      <p>
        For any questions, feedback, or partnership enquiries:
        <br />
        <strong>retrohorrorhub@gmail.com</strong>
      </p>

    

    </Container>
  );
}