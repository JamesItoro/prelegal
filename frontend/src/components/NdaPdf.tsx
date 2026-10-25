import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { NdaDocument, Segment } from "@/lib/nda";

/** Loaded on demand by the download button, so @react-pdf/renderer stays out of the initial bundle. */

const PAGE_HEIGHT = 792; // US Letter, in points

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 64, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.4 },
  title: { fontFamily: "Times-Bold", fontSize: 18, textAlign: "center", marginBottom: 12 },
  paragraph: { marginBottom: 8 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 0.6, color: "#52525b", marginTop: 2 },
  hint: { fontFamily: "Helvetica", fontSize: 8, color: "#71717a" },
  bold: { fontFamily: "Times-Bold" },
  table: { borderTop: "1 solid #a1a1aa", borderLeft: "1 solid #a1a1aa", marginTop: 4, marginBottom: 10 },
  row: { flexDirection: "row" },
  cell: { flex: 2, paddingVertical: 4, paddingHorizontal: 5, borderRight: "1 solid #a1a1aa", borderBottom: "1 solid #a1a1aa" },
  labelCell: { flex: 1, fontFamily: "Times-Bold" },
  signatureCell: { height: 32 },
  sectionBreak: { marginTop: 8 },
  footer: { fontSize: 8.5, color: "#52525b", marginTop: 6 },
  // Positioned from the top: with wrapping content, react-pdf resolves `bottom` against the
  // unpaginated content height, which pushes the footer off the page.
  pageNumber: {
    position: "absolute",
    top: PAGE_HEIGHT - 36,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#71717a",
  },
});

function Segments({ segments }: { segments: Segment[] }) {
  return segments.map((segment, i) => (
    <Text key={i} style={segment.style === "bold" ? styles.bold : undefined}>
      {segment.text}
    </Text>
  ));
}

const PARTY_ROWS = [
  ["Print Name", "name"],
  ["Title", "title"],
  ["Company", "company"],
  ["Notice Address", "noticeAddress"],
] as const;

function Row({ label, cells, tall }: { label: string; cells: [string, string]; tall?: boolean }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.cell, styles.labelCell, tall ? styles.signatureCell : {}]}>{label}</Text>
      {cells.map((text, i) => (
        <Text key={i} style={[styles.cell, tall ? styles.signatureCell : {}]}>
          {text}
        </Text>
      ))}
    </View>
  );
}

export function NdaPdf({ doc }: { doc: NdaDocument }) {
  return (
    <Document title={doc.title} subject="Common Paper Mutual NDA (Version 1.0)">
      <Page size="LETTER" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.paragraph}>
          <Segments segments={doc.intro} />
        </Text>

        {doc.coverPage.map((section) => (
          <View key={section.heading} wrap={false}>
            <Text style={styles.heading}>{section.heading.toUpperCase()}</Text>
            {section.hint && <Text style={styles.hint}>{section.hint}</Text>}
            <Text style={styles.paragraph}>{section.value}</Text>
          </View>
        ))}

        <View wrap={false} style={styles.sectionBreak}>
          <Text style={styles.paragraph}>
            By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
          </Text>
          <View style={styles.table}>
            <Row label="" cells={["PARTY 1", "PARTY 2"]} />
            <Row label="Signature" cells={["", ""]} tall />
            {PARTY_ROWS.map(([label, key]) => (
              <Row key={key} label={label} cells={[doc.parties[0][key].trim(), doc.parties[1][key].trim()]} />
            ))}
            <Row label="Date" cells={["", ""]} />
          </View>
        </View>

        <Text style={styles.title} break>
          Standard Terms
        </Text>
        {doc.clauses.map((clause) => (
          <Text key={clause.number} style={styles.paragraph}>
            {clause.number}. <Text style={styles.bold}>{clause.title}</Text>. <Segments segments={clause.body} />
          </Text>
        ))}
        <Text style={styles.footer}>
          <Segments segments={doc.footer} />
        </Text>
      </Page>
    </Document>
  );
}
