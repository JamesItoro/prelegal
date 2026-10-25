import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { buildNdaDocument, defaultFormData } from "@/lib/nda";
import { loadNdaTemplate } from "@/lib/templates";
import { NdaPdf } from "./NdaPdf";

describe("NdaPdf", () => {
  it("renders the complete agreement as a multi-page PDF", async () => {
    const doc = buildNdaDocument(loadNdaTemplate(), {
      ...defaultFormData,
      effectiveDate: "2026-10-25",
      governingLaw: "Delaware",
      jurisdiction: "New Castle, DE",
      parties: [
        { name: "Ada Lovelace", title: "CEO", company: "Acme, Inc.", noticeAddress: "ada@acme.test" },
        { name: "Alan Turing", title: "CTO", company: "Globex", noticeAddress: "alan@globex.test" },
      ],
    });

    const pdf = (await renderToBuffer(<NdaPdf doc={doc} />)).toString("latin1");

    expect(pdf.startsWith("%PDF-")).toBe(true);
    // Cover page plus the Standard Terms, which start on a new page.
    expect(pdf.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(2);
  }, 30_000);
});
