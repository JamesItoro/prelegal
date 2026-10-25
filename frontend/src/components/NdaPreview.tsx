import type { NdaDocument, Segment } from "@/lib/nda";

function Segments({ segments }: { segments: Segment[] }) {
  return segments.map((segment, i) => {
    switch (segment.style) {
      case "bold":
        return <strong key={i}>{segment.text}</strong>;
      case "ref":
        return (
          <span
            key={i}
            title="Defined on the Cover Page"
            className="font-medium underline decoration-dotted underline-offset-2"
          >
            {segment.text}
          </span>
        );
      default:
        return <span key={i}>{segment.text}</span>;
    }
  });
}

/** Shows a highlighted value, or a bracketed placeholder while the field is empty. */
function Value({ text, placeholder }: { text: string; placeholder: string }) {
  return text ? (
    <mark className="rounded bg-indigo-50 px-0.5 text-indigo-900">{text}</mark>
  ) : (
    <span className="text-amber-700">[{placeholder}]</span>
  );
}

const PARTY_ROWS = [
  ["Print Name", "name"],
  ["Title", "title"],
  ["Company", "company"],
  ["Notice Address", "noticeAddress"],
] as const;

export function NdaPreview({ doc }: { doc: NdaDocument }) {
  return (
    <article className="space-y-8 font-serif text-[15px] leading-relaxed text-zinc-900">
      <header className="space-y-4">
        <h1 className="text-center text-2xl font-bold">{doc.title}</h1>
        <p>
          <Segments segments={doc.intro} />
        </p>
      </header>

      <section className="space-y-4">
        {doc.coverPage.map((section) => (
          <div key={section.heading}>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-zinc-600">
              {section.heading}
            </h2>
            <p className="whitespace-pre-line">
              <Value text={section.value} placeholder={section.heading} />
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <p>By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-1/4 border border-zinc-300 p-2" />
              <th className="border border-zinc-300 p-2">PARTY 1</th>
              <th className="border border-zinc-300 p-2">PARTY 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border border-zinc-300 p-2 text-left font-medium">Signature</th>
              <td className="h-12 border border-zinc-300 p-2" />
              <td className="h-12 border border-zinc-300 p-2" />
            </tr>
            {PARTY_ROWS.map(([label, key]) => (
              <tr key={key}>
                <th className="border border-zinc-300 p-2 text-left font-medium">{label}</th>
                {doc.parties.map((party, i) => (
                  <td key={i} className="border border-zinc-300 p-2 break-words">
                    <Value text={party[key].trim()} placeholder={label} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="border border-zinc-300 p-2 text-left font-medium">Date</th>
              <td className="border border-zinc-300 p-2" />
              <td className="border border-zinc-300 p-2" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-4 border-t border-zinc-200 pt-8">
        <h2 className="text-center text-xl font-bold">Standard Terms</h2>
        <ol className="space-y-3">
          {doc.clauses.map((clause) => (
            <li key={clause.number}>
              {clause.number}. <strong>{clause.title}</strong>. <Segments segments={clause.body} />
            </li>
          ))}
        </ol>
        <p className="text-sm text-zinc-600">
          <Segments segments={doc.footer} />
        </p>
      </section>
    </article>
  );
}
