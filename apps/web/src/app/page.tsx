import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Globe2,
  Layers3,
  MessageCircle,
  MousePointer2,
  Package,
  Palette,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import {
  MarketingNav,
  TemplateGallery,
} from "@/components/marketing/interactive";
import { Brand } from "@/components/brand";
import "./marketing.css";

export const metadata: Metadata = {
  title: "Nexora — A little website. A bigger business.",
  description:
    "Bring your products, services and business story together. Create a beautiful business website with Nexora and make it easier for customers to find you.",
};
const benefits = [
  {
    icon: Store,
    title: "Your business, beautifully online",
    text: "Give your brand a home beyond the social feed. Bring your story, products and contact details together.",
    className: "lavender",
  },
  {
    icon: Package,
    title: "A catalogue worth exploring",
    text: "Organise your products and services, show your prices and make your next customer’s decision a little easier.",
    className: "peach",
  },
  {
    icon: MessageCircle,
    title: "Less searching. More conversations.",
    text: "Help visitors take the next step with clear contact details and a direct path to your WhatsApp.",
    className: "mint",
  },
];
const faqs = [
  [
    "What is Nexora?",
    "Nexora is a website and catalogue platform for small businesses. It brings your business profile, products, services and customer enquiries into one workspace.",
  ],
  [
    "Do I need to know how to code?",
    "No. The workspace uses forms for your business details, catalogue and appearance settings. You don’t need to edit code to manage that content.",
  ],
  [
    "Can I sell both products and services?",
    "Yes. Nexora has separate product and service catalogues, so a business can showcase either or both. Customer checkout, shipping and inventory fulfilment are not included in this release.",
  ],
  [
    "What happens when my trial ends?",
    "The planned trial lasts seven days. An eligible subscription is required to keep a public business website available. Your dashboard and stored business information remain accessible after the trial.",
  ],
  [
    "Are the website examples real customer sites?",
    "No. The examples on this page are design previews with fictional businesses. They show a visual direction, not customer endorsements or a guarantee that every preview is an available theme.",
  ],
  [
    "Are custom domains and team accounts available?",
    "These are planned Premium capabilities. Domain verification, team permissions and public-site delivery still need release validation. Check availability before purchasing a plan for those features.",
  ],
];

export default function Home() {
  return (
    <div className="marketing">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-orb orb-one" aria-hidden="true" />
          <div className="hero-orb orb-two" aria-hidden="true" />
          <div className="marketing-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-spark">
                  <Sparkles size={13} />
                </span>{" "}
                BIG IDEAS. SMALL BUSINESSES.
              </div>
              <h1>
                A little website.
                <br />A <span>bigger</span>
                <br />
                business<span className="period">.</span>
              </h1>
              <p>
                Your passion deserves more than a link in a bio. Bring your
                products, services and story together in one beautiful place.
              </p>
              <div className="hero-actions">
                <Link className="cta-button" href="/register">
                  Start building for free <ArrowUpRight size={18} />
                </Link>
                <a className="text-button" href="#templates">
                  Explore the possibilities <ArrowRight size={17} />
                </a>
              </div>
              <div className="hero-assurance">
                <span>
                  <Check size={14} /> 7-day trial
                </span>
                <span>
                  <Check size={14} /> No coding needed
                </span>
              </div>
            </div>
            <div
              className="hero-art"
              aria-label="Illustrative business website preview"
            >
              <div className="orbit-line" aria-hidden="true" />
              <span className="art-star" aria-hidden="true">
                ✳
              </span>
              <div className="floating-note note-top">
                <span className="note-icon">
                  <Globe2 size={19} />
                </span>
                <div>
                  Your own corner of the internet
                  <small>Made for your next chapter.</small>
                </div>
              </div>
              <div className="hero-browser">
                <div className="browser-bar">
                  <i />
                  <i />
                  <i />
                  <span>nexora / your-business</span>
                  <Globe2 size={12} />
                </div>
                <div className="sample-nav">
                  <strong>
                    form & flora<span>®</span>
                  </strong>
                  <span>
                    Our collection <ArrowUpRight size={10} />
                  </span>
                </div>
                <div className="sample-hero">
                  <div>
                    <span className="sample-label">
                      THOUGHTFULLY MADE. EVERY DAY.
                    </span>
                    <h2>
                      Objects with
                      <br />
                      <em>a little soul.</em>
                    </h2>
                    <span className="sample-pill">
                      Discover the collection ↗
                    </span>
                  </div>
                  <div className="vase-scene" aria-hidden="true">
                    <div className="stem stem-one" />
                    <div className="stem stem-two" />
                    <div className="stem stem-three" />
                    <div className="ceramic-vase" />
                    <div className="vase-shadow" />
                  </div>
                </div>
                <div className="sample-products">
                  <div>
                    <span className="mini-object object-bowl" />
                    <small>The everyday bowl</small>
                  </div>
                  <div>
                    <span className="mini-object object-vase" />
                    <small>A softer kind of space</small>
                  </div>
                  <div>
                    <span className="mini-object object-cup" />
                    <small>Your morning ritual</small>
                  </div>
                </div>
                <div className="sample-bottom">
                  Small details. Beautiful beginnings.
                  <span>DESIGN PREVIEW</span>
                </div>
              </div>
              <div className="floating-note note-bottom">
                <span className="whatsapp-icon">
                  <MessageCircle size={21} />
                </span>
                <div>
                  Start a conversation
                  <small>“Hi! I’d love to know more.”</small>
                </div>
                <CheckCheck size={15} />
              </div>
              <div className="cursor-badge">
                <MousePointer2 size={24} fill="currentColor" />
                <span>Your next customer</span>
              </div>
              <p className="illustration-caption">
                A little inspiration. Fictional business, real possibilities.
              </p>
            </div>
          </div>
        </section>
        <section className="business-strip" aria-label="Who Nexora is for">
          <div className="marketing-container">
            <span>
              FOR THE PEOPLE
              <br />
              <strong>BUILDING SOMETHING.</strong>
            </span>
            <p>
              <Store /> Independent shops
            </p>
            <p>
              <Palette /> Creative studios
            </p>
            <p>
              <Sparkles /> Beauty & wellness
            </p>
            <p>
              <Zap /> Local services
            </p>
          </div>
        </section>
        <section
          className="marketing-section marketing-container"
          id="features"
        >
          <div className="section-heading">
            <span className="eyebrow">LESS COMPLICATED. MORE YOU.</span>
            <h2>
              Everything in one place.
              <br />
              <span>Room for your business to grow.</span>
            </h2>
            <p>
              From your first product to your next enquiry, keep the important
              things close.
            </p>
          </div>
          <div className="benefit-grid">
            {benefits.map(({ icon: Icon, title, text, className }, index) => (
              <article className={`benefit-card ${className}`} key={title}>
                <div className="benefit-art" aria-hidden="true">
                  {index === 0 ? (
                    <div className="mini-site">
                      <div>
                        <i />
                        <i />
                        <i />
                      </div>
                      <span className="mini-site-heading">
                        Hello, world.
                        <br />
                        <em>Meet your next favourite.</em>
                      </span>
                      <div className="mini-site-blocks">
                        <b />
                        <b />
                        <b />
                      </div>
                    </div>
                  ) : index === 1 ? (
                    <div className="catalog-stack">
                      <div>
                        <span>01</span> Products <Package size={24} />
                      </div>
                      <div>
                        <span>02</span> Services <Sparkles size={24} />
                      </div>
                    </div>
                  ) : (
                    <div className="message-demo">
                      <span>Hello! Is this available?</span>
                      <span>
                        Hi there. Let’s talk! <CheckCheck size={15} />
                      </span>
                    </div>
                  )}
                </div>
                <span className="feature-icon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="templates-section" id="templates">
          <div className="marketing-container">
            <div className="section-heading heading-row">
              <div>
                <span className="eyebrow">A STYLE FOR YOUR STORY</span>
                <h2>
                  Different businesses.
                  <br />
                  <span>Beautiful possibilities.</span>
                </h2>
              </div>
              <p>
                A few ways your next chapter could look.
                <br />
                Explore our concept gallery for inspiration.
              </p>
            </div>
            <TemplateGallery />
          </div>
        </section>
        <section
          className="marketing-section marketing-container how-grid"
          id="how-it-works"
        >
          <div className="workspace-illustration">
            <div className="workspace-title">
              <Brand />
              <span>YOUR WORKSPACE</span>
            </div>
            <div className="workspace-body">
              <div className="workspace-rail">
                <Store />
                <Package />
                <Palette />
                <MessageCircle />
              </div>
              <div className="workspace-panel">
                <span className="eyebrow">LET’S MAKE IT YOURS</span>
                <h3>Good things start here.</h3>
                <div className="mock-field">
                  <small>Business name</small>
                  <strong>Your big idea</strong>
                  <Check size={16} />
                </div>
                <div className="mock-field">
                  <small>Your story</small>
                  <span>A little about what makes you different…</span>
                </div>
                <div className="color-options">
                  <i />
                  <i />
                  <i />
                  <i />
                  <span>Your colours. Your style.</span>
                </div>
                <div className="mock-publish">
                  A home for your business <ArrowUpRight size={15} />
                </div>
              </div>
            </div>
            <div className="workspace-sticker">
              <Layers3 size={22} /> Less setup.
              <br />
              <strong>More possibility.</strong>
            </div>
          </div>
          <div className="how-copy">
            <span className="eyebrow">FROM IDEA TO YOUR OWN SPACE</span>
            <h2>
              You bring the passion.
              <br />
              <span>We bring the platform.</span>
            </h2>
            <p>
              Getting online shouldn’t feel like starting a second business.
              Keep it simple, one step at a time.
            </p>
            <ol>
              {[
                [
                  "Make yourself at home",
                  "Create your account and introduce your business.",
                ],
                [
                  "Add what makes you, you",
                  "Bring in your products, services, brand colours and story.",
                ],
                [
                  "Get ready to share",
                  "Review your website, check your details and prepare for your next customer.",
                ],
              ].map(([title, text], i) => (
                <li key={title}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className="text-button" href="/register">
              Let’s build your next chapter <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section className="conversation-banner">
          <div className="marketing-container conversation-grid">
            <div>
              <span className="eyebrow">
                TURN “JUST LOOKING” INTO “LET’S TALK”
              </span>
              <h2>
                Your business online.
                <br />
                Your customers <em>one hello away.</em>
              </h2>
              <p>
                Show people what you do. Make it easy to ask a question. Keep
                the human side of your business at the heart of it all.
              </p>
              <Link className="cta-button light-button" href="/register">
                Create your workspace <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="conversation-art" aria-hidden="true">
              <div className="chat-bubble">I found your business online 👋</div>
              <div className="chat-bubble reply">
                So glad you’re here.
                <br />
                How can we help? <CheckCheck size={16} />
              </div>
              <div className="chat-emblem">
                <MessageCircle size={54} strokeWidth={1.5} />
              </div>
              <span className="chat-spark">✳</span>
            </div>
          </div>
        </section>
        <section
          className="marketing-section marketing-container pricing-section"
          id="pricing"
        >
          <div className="section-heading">
            <span className="eyebrow">A CLEAR NEXT STEP</span>
            <h2>
              Start small.<span> Build from there.</span>
            </h2>
            <p>Explore the workspace first. Choose a plan when you’re ready.</p>
          </div>
          <div className="pricing-grid">
            <article className="price-card">
              <span className="plan-name">TRY IT OUT</span>
              <h3>Your first chapter</h3>
              <div className="plan-price">
                Free<span> / 7 days</span>
              </div>
              <p>
                Get to know the workspace and bring your business details
                together.
              </p>
              <ul>
                {[
                  "Business profile workspace",
                  "Product and service management",
                  "Explore appearance settings",
                ].map((t) => (
                  <li key={t}>
                    <Check size={16} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="cta-button outline-button">
                Start your free trial <ArrowRight size={16} />
              </Link>
            </article>
            <article className="price-card featured-plan">
              <span className="plan-ribbon">THE NEXT CHAPTER</span>
              <span className="plan-name">BASIC</span>
              <h3>A home for your business</h3>
              <div className="plan-price">
                ₦50,000<span> / year</span>
              </div>
              <p>
                The planned annual package for a focused, professional business
                website.
              </p>
              <ul>
                {[
                  "Product and service catalogues",
                  "Business website and branding",
                  "Customer enquiry workspace",
                ].map((t) => (
                  <li key={t}>
                    <Check size={16} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="cta-button">
                Explore the workspace <ArrowRight size={16} />
              </Link>
            </article>
            <article className="price-card">
              <span className="plan-name">PREMIUM · ROADMAP</span>
              <h3>Space for what’s next</h3>
              <div className="plan-price">
                ₦120,000<span> / year</span>
              </div>
              <p>
                Planned expanded capabilities. Confirm availability before
                upgrading.
              </p>
              <ul>
                {[
                  "Custom domains — planned",
                  "Team accounts — planned",
                  "Advanced analytics — planned",
                ].map((t) => (
                  <li key={t}>
                    <Layers3 size={16} />
                    {t}
                  </li>
                ))}
              </ul>
              <a href="#faq" className="cta-button outline-button">
                See what’s available <ArrowRight size={16} />
              </a>
            </article>
          </div>
          <p className="pricing-note">
            Early release: public publishing, billing and advanced capabilities
            require release validation. Prices reflect the current product plan,
            not a promise of live feature availability.
          </p>
        </section>
        <section className="faq-section" id="faq">
          <div className="marketing-container faq-grid">
            <div>
              <span className="eyebrow">A LITTLE MORE CLARITY</span>
              <h2>
                Good questions.
                <br />
                <span>Straight answers.</span>
              </h2>
              <p>Here’s what to know before your first chapter with Nexora.</p>
              <div className="faq-decoration" aria-hidden="true">
                ?
              </div>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span>+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section marketing-container">
          <div className="closing-cta">
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>
              Small business.
              <br />
              <em>Not-so-small possibilities.</em>
            </h2>
            <p>Make space for the business you’re building.</p>
            <Link href="/register" className="cta-button">
              Let’s make it yours <ArrowUpRight size={18} />
            </Link>
            <span className="closing-star" aria-hidden="true">
              ✳
            </span>
          </div>
        </section>
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container footer-top">
          <div>
            <Brand />
            <p>
              A little website.
              <br />A bigger business.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#features">The platform</a>
            <a href="#templates">Design inspiration</a>
            <a href="#how-it-works">How it works</a>
          </div>
          <div>
            <h3>Your next step</h3>
            <a href="#pricing">Plans</a>
            <Link href="/register">Create an account</Link>
            <Link href="/login">Your workspace</Link>
          </div>
          <div>
            <h3>Made for the doers.</h3>
            <p>
              The makers. The dreamers.
              <br />
              The people building something.
            </p>
            <a href="#faq">
              Questions? Start here <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="marketing-container footer-bottom">
          <span>© {new Date().getFullYear()} Nexora. All rights reserved.</span>
          <span>Designed for small businesses. Built for possibility.</span>
        </div>
      </footer>
    </div>
  );
}
