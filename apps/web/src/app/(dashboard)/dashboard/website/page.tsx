import Link from "next/link";
import { ArrowUpRight, Globe2, Palette, Store } from "lucide-react";

export default function WebsitePage() {
  return (
    <div className="workspace-home">
      <div className="workspace-page-heading">
        <div>
          <span className="workspace-eyebrow">A HOME FOR YOUR BUSINESS</span>
          <h1>
            My website<span>.</span>
          </h1>
          <p>Bring your content and your visual identity together.</p>
        </div>
      </div>
      <section className="workspace-welcome">
        <div>
          <span className="workspace-tag">Website setup</span>
          <h2>
            First, make it
            <br />
            <em>feel like you.</em>
          </h2>
          <p>
            Your business profile and appearance settings are ready to edit.
            <br />
            The public website renderer is not yet available in this release.
          </p>
          <Link href="/dashboard/settings">
            Edit your business profile <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="workspace-welcome-art" aria-hidden="true">
          <Globe2 size={85} strokeWidth={1} />
          <span>Your next chapter</span>
        </div>
      </section>
      <div className="workspace-bottom-grid">
        <Link
          className="workspace-panel-card workspace-step"
          href="/dashboard/settings"
        >
          <Store />
          <div>
            <h2>Business details</h2>
            <p>Your story, location and contact information.</p>
          </div>
          <ArrowUpRight />
        </Link>
        <Link
          className="workspace-panel-card workspace-step"
          href="/dashboard/appearance"
        >
          <Palette />
          <div>
            <h2>Appearance</h2>
            <p>Choose your theme, typography and brand colours.</p>
          </div>
          <ArrowUpRight />
        </Link>
      </div>
      <p className="workspace-notice">
        Publishing is a separate release milestone. Saving a setting does not
        confirm that a public website or custom domain is live.
      </p>
    </div>
  );
}
