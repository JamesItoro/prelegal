import { NdaCreator } from "@/components/NdaCreator";
import { loadNdaTemplate } from "@/lib/templates";

// Read once at module scope: the templates are static, so the page is fully prerendered at build time.
const template = loadNdaTemplate();

export default function Home() {
  return (
    <div className="flex-1 bg-zinc-50">
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Mutual NDA Creator</h1>
          <p className="max-w-2xl text-zinc-600">
            Fill in the key details below to generate a Mutual Non-Disclosure Agreement based on the Common Paper
            standard. The preview updates as you type, and you can download the finished agreement as a PDF.
          </p>
        </header>
        <NdaCreator template={template} />
      </main>
    </div>
  );
}
