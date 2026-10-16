import type { CSSProperties } from "react";
import Link from "next/link";
import type { Storefront } from "@nexora/shared-types";
import { ContactForm } from "./contact-form";
import { AnalyticsConsent } from "./analytics-consent";
import "./storefront.css";
const price = (value: string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value));
function Photo({
  url,
  alt,
  hero = false,
}: {
  url?: string | null;
  alt: string;
  hero?: boolean;
}) {
  // Provider URLs have already been checked against the tenant's READY registry.
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading={hero ? "eager" : "lazy"}
      decoding="async"
      className={hero ? "store-hero-image" : "store-image"}
    />
  ) : null;
}
export function StorefrontView({
  site,
  preview = false,
}: {
  site: Storefront;
  preview?: boolean;
}) {
  const b = site.business;
  const targets = new Set(site.sections.map((s) => `#${s.type.toLowerCase()}`));
  return (
    <div
      className={`store-root store-theme-${site.theme.toLowerCase()} ${site.theme === "PORTFOLIO_LITE" ? "store-editorial" : ""}`}
      style={{ "--store-brand": site.primary } as CSSProperties}
    >
      <a href="#store-main" className="store-skip">
        Skip to content
      </a>
      <header className="store-header">
        <a href="#store-main" className="store-brand">
          <Photo url={b.logoUrl} alt="" />
          {b.name}
        </a>
        <nav aria-label="Business website">
          {site.sections
            .filter((s) => s.type !== "HERO")
            .map((s) => (
              <a key={s.type} href={`#${s.type.toLowerCase()}`}>
                {s.type === "ABOUT" ? "Our story" : s.type.toLowerCase()}
              </a>
            ))}
        </nav>
      </header>
      <main id="store-main">
        {site.sections.map((section) => {
          const c = section.content;
          if (section.type === "HERO")
            return (
              <section
                className={`store-hero ${c.imageUrl || b.bannerUrl ? "" : "store-no-image"}`}
                key={section.type}
              >
                <div>
                  <p className="store-eyebrow">
                    WELCOME TO {b.name.toUpperCase()}
                  </p>
                  <h1>{c.headline || b.name}</h1>
                  <p className="store-lead">{c.subheadline || b.description}</p>
                  <a
                    className="store-button"
                    href={
                      c.buttonLink && targets.has(c.buttonLink)
                        ? c.buttonLink
                        : "#contact"
                    }
                  >
                    {c.buttonText || "Let’s talk"}{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                  <p className="store-muted">{b.address}</p>
                </div>
                <Photo url={c.imageUrl || b.bannerUrl} alt={b.name} hero />
              </section>
            );
          if (section.type === "ABOUT")
            return (
              <section
                id="about"
                className={`store-about store-section ${c.imageUrl ? "" : "store-no-image"}`}
                key={section.type}
              >
                <div>
                  <p className="store-eyebrow">A LITTLE ABOUT US</p>
                  <h2>{c.title || "Our story"}</h2>
                  <p className="store-story">
                    {c.description ||
                      b.description ||
                      "Get in touch to learn more about our business."}
                  </p>
                </div>
                <Photo url={c.imageUrl} alt="About our business" />
              </section>
            );
          if (section.type === "PRODUCTS")
            return (
              <section
                id="products"
                className="store-section"
                key={section.type}
              >
                <div className="store-section-heading">
                  <div>
                    <p className="store-eyebrow">DISCOVER SOMETHING GOOD</p>
                    <h2>{c.title || "Our products"}</h2>
                    <p>{c.subtitle}</p>
                  </div>
                  <span>{site.productsTotal} products</span>
                </div>
                <div className="store-grid">
                  {site.products.map((p) => (
                    <article key={p.id} className="store-card">
                      <Photo
                        url={p.images[0]?.url}
                        alt={p.images[0]?.altText || p.name}
                      />
                      <div>
                        <span className="store-muted">
                          {p.availability.replaceAll("_", " ")}
                        </span>
                        <h3>{p.name}</h3>
                        <p>{p.description}</p>
                        <strong>{price(p.price)}</strong>
                        <a href="#contact">
                          Ask about this product{" "}
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
                {!site.products.length && (
                  <p>No products are listed yet. Contact us for details.</p>
                )}
              </section>
            );
          if (section.type === "SERVICES")
            return (
              <section
                id="services"
                className="store-section store-tinted"
                key={section.type}
              >
                <p className="store-eyebrow">WHAT WE CAN DO FOR YOU</p>
                <h2>{c.title || "Our services"}</h2>
                <p>{c.subtitle}</p>
                <div className="store-grid">
                  {site.services.map((s) => (
                    <article key={s.id} className="store-card">
                      <Photo url={s.images[0]} alt={s.name} />
                      <div>
                        <h3>{s.name}</h3>
                        <p>{s.description}</p>
                        <strong>
                          {s.price !== null
                            ? price(s.price)
                            : s.priceLabel || "Contact for pricing"}
                        </strong>
                        <a href="#contact">Enquire about this service ↗</a>
                      </div>
                    </article>
                  ))}
                </div>
                {!site.services.length && (
                  <p>Contact us to discuss what you need.</p>
                )}
              </section>
            );
          return (
            <section
              id="contact"
              key={section.type}
              className="store-section store-contact"
            >
              <div>
                <p className="store-eyebrow">START A CONVERSATION</p>
                <h2>{c.title || "We’d love to hear from you."}</h2>
                <p>{b.address}</p>
                {b.phone && (
                  <p>
                    <a href={`tel:${b.phone.replace(/[^+0-9]/g, "")}`}>
                      {b.phone}
                    </a>
                  </p>
                )}
                {b.email && c.email !== false && (
                  <p>
                    <a href={`mailto:${encodeURIComponent(b.email)}`}>
                      {b.email}
                    </a>
                  </p>
                )}
                {b.whatsapp && c.whatsapp !== false && (
                  <a
                    href={`https://wa.me/${b.whatsapp}`}
                      data-store-whatsapp
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-button"
                  >
                    Chat on WhatsApp ↗
                  </a>
                )}
              </div>
              <ContactForm businessId={b.id} preview={preview} />
            </section>
          );
        })}
        {!preview &&
          Math.max(site.productsTotal, site.servicesTotal) > site.pageSize && (
            <nav
              className="store-section store-pagination"
              aria-label="Catalogue pages"
            >
              {site.page > 1 && (
                <a
                  className="store-button"
                  href={`/@${b.slug}?page=${site.page - 1}`}
                >
                  Previous page
                </a>
              )}{" "}
              <span>Page {site.page}</span>{" "}
              {site.page * site.pageSize <
                Math.max(site.productsTotal, site.servicesTotal) && (
                <a
                  className="store-button"
                  href={`/@${b.slug}?page=${site.page + 1}`}
                >
                  Next page
                </a>
              )}
            </nav>
          )}
      </main>
      <footer className="store-footer">
        <strong>{b.name}</strong>
        <span>
          A business website made with <Link href="/">Nexora</Link>.
        </span>
      </footer>
      {!preview && site.analyticsEnabled && <AnalyticsConsent key={b.id} businessId={b.id} />}
    </div>
  );
}
