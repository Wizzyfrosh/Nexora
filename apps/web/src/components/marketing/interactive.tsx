"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="marketing-nav">
      <div className="marketing-container nav-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#features">Why Nexora</a>
          <a href="#templates">Inspiration</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="nav-signin">
            Log in
          </Link>
          <Link className="cta-button nav-cta" href="/register">
            Get started <ArrowUpRight size={15} />
          </Link>
          <button
            className="mobile-menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          className="mobile-navigation"
          id="mobile-navigation"
          aria-label="Mobile navigation"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {[
            ["Why Nexora", "#features"],
            ["Inspiration", "#templates"],
            ["How it works", "#how-it-works"],
            ["Pricing", "#pricing"],
            ["Questions", "#faq"],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={15} />
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

const concepts = [
  {
    id: "flora",
    name: "Form & Flora",
    category: "Retail",
    description: "Thoughtful objects. A natural point of view.",
    headline: "Make room for\nsomething lovely.",
    style: "flora",
    label: "LIVING, A LITTLE SLOWER",
    image: "retail.jpg",
  },
  {
    id: "studio",
    name: "Studio Amara",
    category: "Services",
    description: "A little confidence, beautifully expressed.",
    headline: "A little care.\nA whole new glow.",
    style: "studio",
    label: "YOUR MOMENT TO FEEL GOOD",
    image: "salon.jpg",
  },
  {
    id: "crumb",
    name: "Sunday Crumb",
    category: "Food & drink",
    description: "Fresh ideas. Even fresher beginnings.",
    headline: "Made with love.\nGone by Sunday.",
    style: "crumb",
    label: "SMALL BATCH. BIG FEELINGS.",
    image: "bakery.jpg",
  },
];

export function TemplateGallery() {
  const [category, setCategory] = useState("All businesses");
  const visible = concepts.filter(
    (c) => category === "All businesses" || c.category === category,
  );
  return (
    <>
      <div className="template-filters" aria-label="Filter design concepts">
        {["All businesses", "Retail", "Services", "Food & drink"].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="template-grid" aria-live="polite">
        {visible.map((c) => (
          <article className="template-card" key={c.id}>
            <div className={`template-preview ${c.style}`}>
              <div className="template-chrome">
                <i />
                <i />
                <i />
                <span>DESIGN CONCEPT</span>
              </div>
              <div className="template-site-nav">
                <strong>{c.name}</strong>
                <span>Our story &nbsp; Contact</span>
              </div>
              <div className="template-content">
                <small>{c.label}</small>
                <h3>{c.headline}</h3>
                <div
                  className="template-photo"
                  style={{
                    backgroundImage: `url(/images/${c.image})`,
                  }}
                  role="img"
                  aria-label={`${c.category} concept photography`}
                />
                <span>Discover something good ↗</span>
              </div>
            </div>
            <div className="template-caption">
              <div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </div>
              <Link
                href="/register"
                aria-label={`Create an account to explore ${c.category.toLowerCase()} website ideas`}
              >
                <ArrowUpRight size={20} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="concept-disclaimer">
        Illustrative design concepts, not live customer websites or a list of
        released themes.
      </p>
    </>
  );
}
