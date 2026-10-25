"use client";

import { useState } from "react";
import { buildNdaDocument, defaultFormData, pdfFileName, validate, type NdaTemplate } from "@/lib/nda";
import { NdaForm } from "./NdaForm";
import { NdaPreview } from "./NdaPreview";

/** Generates the PDF in the browser and triggers a download. */
async function downloadPdf(doc: ReturnType<typeof buildNdaDocument>, fileName: string) {
  const [{ pdf }, { NdaPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./NdaPdf")]);
  const blob = await pdf(<NdaPdf doc={doc} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NdaCreator({ template }: { template: NdaTemplate }) {
  const [data, setData] = useState(defaultFormData);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  const doc = buildNdaDocument(template, data);
  const errors = validate(data);

  async function handleDownload() {
    setStatus("generating");
    try {
      await downloadPdf(doc, pdfFileName(data));
      setStatus("idle");
    } catch (error) {
      console.error("Failed to generate NDA PDF", error);
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-6">
        <NdaForm data={data} onChange={setData} />

        <div className="sticky bottom-0 space-y-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={errors.length > 0 || status === "generating"}
            onClick={handleDownload}
          >
            {status === "generating" ? "Generating PDF…" : "Download PDF"}
          </button>
          {status === "error" && (
            <p role="alert" className="text-sm text-red-700">
              Sorry, the PDF could not be generated. Please try again.
            </p>
          )}
          {errors.length > 0 && (
            <div className="text-sm text-zinc-600">
              <p>Complete these fields to download:</p>
              <ul className="mt-1 list-inside list-disc text-amber-700">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section aria-label="Document preview" className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm lg:p-12">
        <NdaPreview doc={doc} />
      </section>
    </div>
  );
}
