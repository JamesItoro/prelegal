import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCoverPageIntro, parseStandardTerms, type NdaTemplate } from "./nda";

/** The repo-level templates directory (populated by KAN-5), one level above this app. */
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

const readTemplate = (fileName: string) => readFileSync(path.join(TEMPLATES_DIR, fileName), "utf-8");

/** Server-only: reads and parses the Mutual NDA templates. Runs at build time when the page is prerendered. */
export function loadNdaTemplate(): NdaTemplate {
  return {
    intro: parseCoverPageIntro(readTemplate("Mutual-NDA-coverpage.md")),
    ...parseStandardTerms(readTemplate("Mutual-NDA.md")),
  };
}
