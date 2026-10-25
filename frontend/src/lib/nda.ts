/**
 * Mutual NDA document model.
 *
 * Parses the Common Paper Mutual NDA templates (see /templates) and fills them
 * with the user's form data. The resulting `NdaDocument` is rendered by both the
 * on-screen preview and the PDF, so the agreement wording lives in one place.
 */

export type Party = {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
};

export type NdaFormData = {
  purpose: string;
  /** ISO date, YYYY-MM-DD. */
  effectiveDate: string;
  mndaTermKind: "expires" | "untilTerminated";
  mndaTermYears: number;
  confidentialityKind: "years" | "perpetual";
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  parties: [Party, Party];
};

/**
 * A run of agreement text. `ref` marks a reference to a term defined on the
 * Cover Page (e.g. "Governing Law").
 */
export type Segment = { style: "plain" | "bold" | "ref"; text: string };

export type Clause = { number: number; title: string; body: Segment[] };

/** The parsed, unfilled template. Plain data, so it can be passed to client components. */
export type NdaTemplate = {
  intro: Segment[];
  clauses: Clause[];
  footer: Segment[];
};

export type CoverPageSection = {
  heading: string;
  hint?: string;
  /** Empty when the user has not filled it in yet. */
  value: string;
};

export type NdaDocument = {
  title: string;
  intro: Segment[];
  coverPage: CoverPageSection[];
  parties: [Party, Party];
  clauses: Clause[];
  footer: Segment[];
};

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

/** Defaults mirror the bracketed suggestions in the Common Paper cover page. */
export const defaultFormData: NdaFormData = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTermKind: "expires",
  mndaTermYears: 1,
  confidentialityKind: "years",
  confidentialityYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  parties: [emptyParty, emptyParty],
};

// Matches, in order: **bold**, <span class="coverpage_link">Ref</span>, [link text](url)
const INLINE_TOKEN = /\*\*(.+?)\*\*|<span class="coverpage_link">(.+?)<\/span>|\[(.+?)\]\((.+?)\)/g;

/** Splits a line of template markdown into styled segments. Links become plain text. */
export function tokenize(markdown: string): Segment[] {
  const segments: Segment[] = [];
  const push = (style: Segment["style"], text: string) => {
    const last = segments.at(-1);
    if (style === "plain" && last?.style === "plain") last.text += text;
    else if (text) segments.push({ style, text });
  };

  let cursor = 0;
  for (const match of markdown.matchAll(INLINE_TOKEN)) {
    push("plain", markdown.slice(cursor, match.index));
    const [, bold, ref, linkText] = match;
    if (bold !== undefined) push("bold", bold);
    else if (ref !== undefined) push("ref", ref);
    else push("plain", linkText);
    cursor = match.index + match[0].length;
  }
  push("plain", markdown.slice(cursor));
  return segments;
}

const lines = (markdown: string) => markdown.split(/\r?\n/).map((line) => line.trim());

/** Extracts the "Using this Mutual Non-Disclosure Agreement" paragraph from the cover page template. */
export function parseCoverPageIntro(coverPageMarkdown: string): Segment[] {
  const all = lines(coverPageMarkdown);
  const headingIndex = all.findIndex((line) => /^##\s+USING THIS/i.test(line));
  const intro = all.slice(headingIndex + 1).find(Boolean);
  if (headingIndex === -1 || !intro) {
    throw new Error("Mutual NDA cover page template: introduction paragraph not found");
  }
  return tokenize(intro);
}

/** Parses the numbered clauses and attribution footer of the Standard Terms template. */
export function parseStandardTerms(termsMarkdown: string): Pick<NdaTemplate, "clauses" | "footer"> {
  const clauses: Clause[] = [];
  let footer: Segment[] = [];

  for (const line of lines(termsMarkdown)) {
    const clause = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\.\s+(.*)$/);
    if (clause) {
      clauses.push({ number: Number(clause[1]), title: clause[2], body: tokenize(clause[3]) });
    } else if (line.startsWith("Common Paper")) {
      footer = tokenize(line);
    }
  }

  if (clauses.length === 0) {
    throw new Error("Mutual NDA standard terms template: no clauses found");
  }
  return { clauses, footer };
}

/** Formats an ISO date (YYYY-MM-DD) as e.g. "October 25, 2026". Returns "" for invalid input. */
export function formatDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const years = (n: number) => `${n} year${n === 1 ? "" : "s"}`;

export function describeMndaTerm(data: NdaFormData): string {
  return data.mndaTermKind === "expires"
    ? `Expires ${years(data.mndaTermYears)} from Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";
}

export function describeConfidentialityTerm(data: NdaFormData): string {
  return data.confidentialityKind === "years"
    ? `${years(data.confidentialityYears)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "In perpetuity.";
}

/**
 * Combines the template and form data into the complete agreement.
 *
 * The user's values go on the Cover Page only. The Standard Terms are kept verbatim
 * (the Cover Page states they are identical to Common Paper's published version) and
 * refer to the Cover Page through defined terms such as "Governing Law".
 */
export function buildNdaDocument(template: NdaTemplate, data: NdaFormData): NdaDocument {
  return {
    title: "Mutual Non-Disclosure Agreement",
    intro: template.intro,
    coverPage: [
      { heading: "Purpose", hint: "How Confidential Information may be used", value: data.purpose.trim() },
      { heading: "Effective Date", value: formatDate(data.effectiveDate) },
      { heading: "MNDA Term", hint: "The length of this MNDA", value: describeMndaTerm(data) },
      {
        heading: "Term of Confidentiality",
        hint: "How long Confidential Information is protected",
        value: describeConfidentialityTerm(data),
      },
      { heading: "Governing Law", value: data.governingLaw.trim() },
      { heading: "Jurisdiction", value: data.jurisdiction.trim() },
      { heading: "MNDA Modifications", value: data.modifications.trim() || "None." },
    ],
    parties: data.parties,
    clauses: template.clauses,
    footer: template.footer,
  };
}

const isPositiveInteger = (n: number) => Number.isInteger(n) && n >= 1;

/** Returns a human-readable list of problems; empty when the form is ready to download. */
export function validate(data: NdaFormData): string[] {
  const errors: string[] = [];
  const require = (value: string, label: string) => {
    if (!value.trim()) errors.push(`${label} is required`);
  };

  require(data.purpose, "Purpose");
  if (!formatDate(data.effectiveDate)) errors.push("Effective Date is required");
  if (data.mndaTermKind === "expires" && !isPositiveInteger(data.mndaTermYears)) {
    errors.push("MNDA Term must be a whole number of years (1 or more)");
  }
  if (data.confidentialityKind === "years" && !isPositiveInteger(data.confidentialityYears)) {
    errors.push("Term of Confidentiality must be a whole number of years (1 or more)");
  }
  require(data.governingLaw, "Governing Law");
  require(data.jurisdiction, "Jurisdiction");
  data.parties.forEach((party, i) => {
    require(party.name, `Party ${i + 1} name`);
    require(party.company, `Party ${i + 1} company`);
  });
  return errors;
}

/** e.g. "Mutual-NDA-Acme-Inc-Globex.pdf" */
export function pdfFileName(data: NdaFormData): string {
  const slug = (s: string) => s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const companies = data.parties.map((p) => slug(p.company)).filter(Boolean);
  return ["Mutual-NDA", ...companies].join("-") + ".pdf";
}
