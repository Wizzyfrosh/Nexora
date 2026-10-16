# Reference-led design brief

## Direction

Combine all three user-supplied references into a small-business SaaS identity.

- Ice-cream reference: generous section rhythm, expressive editorial headings, catalogue/gallery presentation and contrasting promotion band.
- Analytics SaaS reference: light background, purple accents, clean navigation, floating product cards and clear feature hierarchy.
- Learning reference: asymmetric hero composition, lilac surfaces, warm accents, prominent CTA and visual step-by-step explanation.
  Translate the structure and visual language; do not use ice-cream/course claims, third-party logos, fake user counts or irrelevant content.

## Implemented system

Ink #241837; purple #743bc0; lilac #f7f2fc; warm peach and muted sage as secondary surfaces.
Sans-serif interface; selective Georgia italic for editorial emphasis. Clear hierarchy, generous whitespace, subtle borders/shadows and restrained float motion.
Hero uses a CSS-built fictional storefront browser and ceramic forms. It is an illustration, not a screenshot of a finished renderer.
Gallery concepts are explicitly fictional and separate from installed theme presets.

## Homepage content order

Navigation → expressive hero/CTA → business categories → three illustrated benefits → filterable concept gallery → owner-workspace walkthrough → conversation band → trial/basic/premium plan explanation → FAQ → closing CTA → useful footer.
All CTA links lead to implemented routes or existing section IDs. No dead /templates links.
Remove unsupported “#1”, “thousands of customers”, “enterprise-grade” and guaranteed uptime claims.

## Workspace and account screens

Same identity across register/login/dashboard shell. Keep existing CRUD integrations.
Replace fake overview statistics with API-derived counts. Leave analytics unavailable until actual collection/aggregation exists.
Sidebar should link only to implemented pages; website setup is a truthful interim screen.
Existing catalogue/settings/billing forms inherit shared tokens; redesigning their complete workflows is a later slice.

## Interaction/accessibility

Native details/summary for FAQ, button aria-pressed for gallery filters, labelled menus, visible focus, single H1, meaningful document title.
No information conveyed by colour alone. Decorative shapes are hidden from assistive tech.
Use focus trapping if navigation is later converted into a modal; current menu is a disclosure, not a dialog.
Reduce/disable animation under prefers-reduced-motion; avoid infinite resource-heavy motion or layout shifts.
Test at 360, 390, 768, 1024 and 1440px. Do not hide text as a mobile shortcut.
Typography and faint supporting text require contrast review before declaring WCAG conformance.

## Inspiration research

Carrd: simple focused site creation and visible template exploration — https://carrd.com/
Durable editor guidance: publishing status, preview and SEO as explicit tasks — https://help.durable.co/en/collections/6398668-website-editor
These are layout/workflow references. Their AI, ecommerce and commercial claims are not Nexora features.
