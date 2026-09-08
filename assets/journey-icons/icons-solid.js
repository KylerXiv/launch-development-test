// LAUNCH journey icons — SOLID set, for the illustrated journey dashboard.
//
// A filled companion to assets/journey-icons/icons.js (the monoline set the
// other four editions use). Drawn to sit beside the WHO emblem on that page:
// the emblem is a solid mark, and a filled set reads as its peer where the
// outline set read as a different system bolted alongside it.
//
// Subjects follow the LAUNCH "Journey of an antimalarial medicine" board, so
// each of the eight gates borrows the figure that board gives the same step:
// microscope (discovery), institution (submission to an SRA), stamp (country
// registration), assembled people (national policy), cart (procurement),
// lorry (delivery). Stages 3 and 4 are WHO gates and carry the WHO emblem
// instead — see assets/who-emblem.svg — so nothing is drawn for them here.
//
// Same contract as the outline set: one 24x24 grid, NO colour of its own —
// it fills in `currentColor` so each glyph takes the colour of the status it
// is reporting and themes correctly in dark mode.
(function () {
  const ICONS = [
    {
      id: "01-rnd-clinical",
      title: "R&D & clinical",
      // Conical flask, the same subject the outline set used — the change here
      // is the style, not the meaning. A microscope was tried first and read as
      // a gavel once it was down at 26px; the flask survives 22px intact.
      body: `
        <rect x="8.4" y="2.1" width="7.2" height="1.9" rx=".95"/>
        <path d="M10 4.5h4v3.6l5.1 10.4A2 2 0 0 1 17.3 21.5H6.7a2 2 0 0 1-1.8-2.9L10 8.1z"/>`
    },
    {
      id: "02-regulatory-approval",
      title: "Regulatory approval (SRA)",
      // The authority itself: pediment, entablature, columns, plinth.
      body: `
        <path d="M12 2.2 22.2 8v1.5H1.8V8z"/>
        <rect x="3.3" y="10.5" width="17.4" height="1.8"/>
        <rect x="5" y="13" width="2.9" height="6.3"/>
        <rect x="10.55" y="13" width="2.9" height="6.3"/>
        <rect x="16.1" y="13" width="2.9" height="6.3"/>
        <path d="M2.6 19.7h18.8a1.25 1.25 0 0 1 0 2.5H2.6a1.25 1.25 0 0 1 0-2.5z"/>`
    },
    { id: "03-who-guidelines",      title: "WHO guidelines",      body: "" },   // WHO emblem
    {
      id: "04-who-prequalification",
      title: "WHO prequalification",
      // A quality seal on a ribbon — the mark awarded, which is what
      // prequalification is. The board gives this step a tick in a circle, but
      // a tick cannot be borrowed here: every marker already carries a tick as
      // its "complete" status badge, and side by side the two read as one
      // stutter and turn the subject into a second badge. A star says the same
      // thing without competing, and the ribbon breaks the circle-in-a-circle.
      body: `
        <path d="M12 1.6a8.6 8.6 0 1 0 0 17.2A8.6 8.6 0 0 0 12 1.6zm0 3.3 1.75 3.55 3.92.57-2.84 2.76.67 3.9L12 13.8l-3.5 1.88.67-3.9-2.84-2.76 3.92-.57z"/>
        <path d="M7.4 18.4 5.9 23.2l3.4-1.7 3.4 1.7-1.5-4.8a10 10 0 0 1-3.8 0z"/>`
    },
    {
      id: "05-country-registration",
      title: "Country registration",
      // Entered on a national register: a stamp over its pad.
      body: `
        <rect x="10.5" y="2.1" width="3" height="4.1" rx="1.5"/>
        <rect x="11.2" y="5.7" width="1.6" height="2.1"/>
        <path d="M8.4 7.6h7.2l1.95 4.2H6.45z"/>
        <rect x="6.2" y="12.1" width="11.6" height="3.7" rx="1.25"/>
        <path d="M3.2 18.3h17.6a1.3 1.3 0 0 1 0 2.6H3.2a1.3 1.3 0 0 1 0-2.6z"/>`
    },
    {
      id: "06-national-policy",
      title: "National policy adoption",
      // A committee decides: three figures, the nearest one leading.
      body: `
        <circle cx="12" cy="7.4" r="3.3"/>
        <path d="M12 11.9c-3.6 0-6.4 2.3-6.4 5.3v1.4h12.8v-1.4c0-3-2.8-5.3-6.4-5.3z"/>
        <circle cx="4.5" cy="10.4" r="2.5"/>
        <path d="M4.5 14c-2.4 0-4.2 1.6-4.2 3.6v1h3.5c.1-2.1 1.2-3.9 2.9-4.4-.7-.1-1.4-.2-2.2-.2z"/>
        <circle cx="19.5" cy="10.4" r="2.5"/>
        <path d="M19.5 14c2.4 0 4.2 1.6 4.2 3.6v1h-3.5c-.1-2.1-1.2-3.9-2.9-4.4.7-.1 1.4-.2 2.2-.2z"/>`
    },
    {
      id: "07-procurement",
      title: "Procurement",
      // Bought in volume: a laden cart.
      body: `
        <path d="M1.9 2.5h2.7a1.3 1.3 0 0 1 1.27 1l.52 2.2h13.8a1.25 1.25 0 0 1 1.21 1.56l-1.85 7.1a2 2 0 0 1-1.94 1.5H8.2a2 2 0 0 1-1.95-1.55L3.6 4.9H1.9a1.2 1.2 0 0 1 0-2.4z"/>
        <circle cx="9.1" cy="20" r="2.05"/>
        <circle cx="17.6" cy="20" r="2.05"/>`
    },
    {
      id: "08-in-country-delivery",
      title: "In-country delivery",
      // The last mile: stock on the road to the facility.
      body: `
        <path d="M2.7 5.5h10.1a1.45 1.45 0 0 1 1.45 1.45v8.75H2.7A1.45 1.45 0 0 1 1.25 14.25V6.95A1.45 1.45 0 0 1 2.7 5.5z"/>
        <path d="M14.35 8.7h4.2a1.45 1.45 0 0 1 1.08.48l2.55 2.85a1.45 1.45 0 0 1 .37.97v2.7h-8.2z"/>
        <path d="M7 16.3a3.05 3.05 0 1 0 0 6.1 3.05 3.05 0 0 0 0-6.1zm0 1.95a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>
        <path d="M18 16.3a3.05 3.05 0 1 0 0 6.1 3.05 3.05 0 0 0 0-6.1zm0 1.95a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>`
    }
  ];

  // Filled, not stroked — the one difference from the outline set that matters.
  // fill-rule cuts the hubs out of the lorry wheels on any background.
  const ATTR = 'fill="currentColor" stroke="none" fill-rule="evenodd"';

  const clean = s => s.replace(/\s+/g, " ").trim();

  window.LaunchJourneyIconsSolid = {
    list: ICONS,
    attrs: ATTR,
    sprite() {
      const symbols = ICONS.filter(ic => ic.body).map(ic =>
        `<symbol id="jis-${ic.id}" viewBox="0 0 24 24"><g ${ATTR}>${clean(ic.body)}</g></symbol>`
      ).join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ` +
        `style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`;
    },
    use(i, cls) {
      const ic = ICONS[i];
      if (!ic || !ic.body) return "";
      return `<svg class="${cls || ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
        `<use href="#jis-${ic.id}"/></svg>`;
    }
  };
})();
