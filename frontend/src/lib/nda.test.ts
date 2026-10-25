import { describe, expect, it } from "vitest";
import {
  buildNdaDocument,
  defaultFormData,
  formatDate,
  parseCoverPageIntro,
  parseStandardTerms,
  pdfFileName,
  tokenize,
  validate,
  type NdaFormData,
} from "./nda";
import { loadNdaTemplate } from "./templates";

const filledForm: NdaFormData = {
  ...defaultFormData,
  effectiveDate: "2026-10-25",
  mndaTermYears: 2,
  confidentialityYears: 3,
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
  parties: [
    { name: "Ada Lovelace", title: "CEO", company: "Acme, Inc.", noticeAddress: "ada@acme.test" },
    { name: "Alan Turing", title: "CTO", company: "Globex", noticeAddress: "alan@globex.test" },
  ],
};

describe("tokenize", () => {
  it("splits bold text, cover page references and links into segments", () => {
    expect(
      tokenize('A **Term** for the <span class="coverpage_link">Purpose</span> at [example.com](https://example.com).'),
    ).toEqual([
      { style: "plain", text: "A " },
      { style: "bold", text: "Term" },
      { style: "plain", text: " for the " },
      { style: "ref", text: "Purpose" },
      { style: "plain", text: " at example.com." },
    ]);
  });

  it("returns a single plain segment when there is no markup", () => {
    expect(tokenize("Just text.")).toEqual([{ style: "plain", text: "Just text." }]);
  });
});

describe("parseStandardTerms", () => {
  it("parses numbered clauses and the attribution footer, including CRLF line endings", () => {
    const md = [
      "# Standard Terms",
      "",
      '1. **Introduction**. Uses the <span class="coverpage_link">Purpose</span>.',
      "",
      "2. **Disclaimer**. AS IS.",
      "",
      "Common Paper Mutual Non-Disclosure Agreement free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).",
    ].join("\r\n");

    const { clauses, footer } = parseStandardTerms(md);

    expect(clauses.map((c) => [c.number, c.title])).toEqual([
      [1, "Introduction"],
      [2, "Disclaimer"],
    ]);
    expect(clauses[0].body).toContainEqual({ style: "ref", text: "Purpose" });
    expect(footer.map((s) => s.text).join("")).toBe(
      "Common Paper Mutual Non-Disclosure Agreement free to use under CC BY 4.0.",
    );
  });

  it("throws when the template has no clauses", () => {
    expect(() => parseStandardTerms("# Nothing here")).toThrow(/no clauses/);
  });
});

describe("parseCoverPageIntro", () => {
  it("throws when the introduction is missing", () => {
    expect(() => parseCoverPageIntro("# Mutual NDA")).toThrow(/introduction/);
  });
});

describe("real Common Paper templates", () => {
  const template = loadNdaTemplate();

  it("parses all 11 Standard Terms clauses", () => {
    expect(template.clauses.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(template.clauses[8].title).toBe("Governing Law and Jurisdiction");
  });

  it("parses the cover page introduction", () => {
    expect(template.intro.map((s) => s.text).join("")).toMatch(/^This Mutual Non-Disclosure Agreement/);
  });

  it("keeps the Standard Terms verbatim, referring to Cover Page terms by name", () => {
    const doc = buildNdaDocument(template, filledForm);
    const text = doc.clauses[8].body.map((s) => s.text).join("");

    expect(doc.clauses).toEqual(template.clauses);
    expect(text).toContain("the laws of the State of Governing Law");
    expect(text).not.toContain("Delaware");
    expect(doc.clauses[8].body).toContainEqual({ style: "ref", text: "Jurisdiction" });
  });
});

describe("buildNdaDocument cover page", () => {
  const template = { intro: [], clauses: [], footer: [] };
  const section = (data: NdaFormData, heading: string) =>
    buildNdaDocument(template, data).coverPage.find((s) => s.heading === heading)?.value;

  it("describes fixed-length terms with correct pluralisation", () => {
    expect(section({ ...filledForm, mndaTermYears: 1 }, "MNDA Term")).toBe("Expires 1 year from Effective Date.");
    expect(section(filledForm, "Term of Confidentiality")).toMatch(/^3 years from Effective Date, but in the case of trade secrets/);
  });

  it("describes open-ended terms", () => {
    const data: NdaFormData = { ...filledForm, mndaTermKind: "untilTerminated", confidentialityKind: "perpetual" };
    expect(section(data, "MNDA Term")).toBe("Continues until terminated in accordance with the terms of the MNDA.");
    expect(section(data, "Term of Confidentiality")).toBe("In perpetuity.");
  });

  it("shows 'None.' when there are no modifications", () => {
    expect(section(filledForm, "MNDA Modifications")).toBe("None.");
    expect(section({ ...filledForm, modifications: " Clause 8 is deleted. " }, "MNDA Modifications")).toBe(
      "Clause 8 is deleted.",
    );
  });
});

describe("formatDate", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("25/10/2026")).toBe("");
  });
});

describe("validate", () => {
  it("accepts a complete form", () => {
    expect(validate(filledForm)).toEqual([]);
  });

  it("reports every missing required field on the default form", () => {
    expect(validate(defaultFormData)).toEqual([
      "Effective Date is required",
      "Governing Law is required",
      "Jurisdiction is required",
      "Party 1 name is required",
      "Party 1 company is required",
      "Party 2 name is required",
      "Party 2 company is required",
    ]);
  });

  it("rejects invalid year counts only when a fixed term is selected", () => {
    expect(validate({ ...filledForm, mndaTermYears: 0 })).toEqual([
      "MNDA Term must be a whole number of years (1 or more)",
    ]);
    expect(validate({ ...filledForm, confidentialityYears: 1.5 })).toHaveLength(1);
    expect(validate({ ...filledForm, mndaTermKind: "untilTerminated", mndaTermYears: 0 })).toEqual([]);
  });
});

describe("pdfFileName", () => {
  it("slugifies both company names", () => {
    expect(pdfFileName(filledForm)).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
  });

  it("falls back to a generic name when companies are blank", () => {
    expect(pdfFileName(defaultFormData)).toBe("Mutual-NDA.pdf");
  });
});
