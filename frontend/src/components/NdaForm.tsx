"use client";

import type { ReactNode } from "react";
import type { NdaFormData, Party } from "@/lib/nda";

type Props = {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-600">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A radio pair choosing between a fixed number of years and an open-ended option. */
function TermChoice<K extends string>({
  name,
  kind,
  yearsKind,
  years,
  yearsLabel,
  otherKind,
  otherLabel,
  onChange,
}: {
  name: string;
  kind: K;
  yearsKind: K;
  years: number;
  yearsLabel: string;
  otherKind: K;
  otherLabel: string;
  onChange: (kind: K, years: number) => void;
}) {
  return (
    <div className="space-y-2 text-sm text-zinc-800">
      <label className="flex items-center gap-2">
        <input type="radio" name={name} checked={kind === yearsKind} onChange={() => onChange(yearsKind, years)} />
        <input
          type="number"
          min={1}
          step={1}
          aria-label={`${name} years`}
          className={`${inputClass} w-20`}
          value={Number.isNaN(years) ? "" : years}
          disabled={kind !== yearsKind}
          onChange={(e) => onChange(yearsKind, e.target.valueAsNumber)}
        />
        <span>{yearsLabel}</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name={name} checked={kind === otherKind} onChange={() => onChange(otherKind, years)} />
        <span>{otherLabel}</span>
      </label>
    </div>
  );
}

export function NdaForm({ data, onChange }: Props) {
  const set = <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) => onChange({ ...data, [key]: value });

  const setParty = (index: 0 | 1, key: keyof Party, value: string) => {
    const parties: [Party, Party] = [...data.parties];
    parties[index] = { ...parties[index], [key]: value };
    set("parties", parties);
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Section title="Agreement terms">
        <Field label="Purpose" hint="How Confidential Information may be used">
          <textarea
            className={inputClass}
            rows={3}
            value={data.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </Field>

        <Field label="Effective Date">
          <div className="flex gap-2">
            <input
              type="date"
              className={inputClass}
              value={data.effectiveDate}
              onChange={(e) => set("effectiveDate", e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-md border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              onClick={() => set("effectiveDate", todayIso())}
            >
              Today
            </button>
          </div>
        </Field>

        <Field label="MNDA Term" hint="The length of this MNDA">
          <TermChoice
            name="mndaTerm"
            kind={data.mndaTermKind}
            yearsKind="expires"
            years={data.mndaTermYears}
            yearsLabel="year(s) from Effective Date"
            otherKind="untilTerminated"
            otherLabel="Continues until terminated"
            onChange={(kind, years) => onChange({ ...data, mndaTermKind: kind, mndaTermYears: years })}
          />
        </Field>

        <Field label="Term of Confidentiality" hint="How long Confidential Information is protected">
          <TermChoice
            name="confidentiality"
            kind={data.confidentialityKind}
            yearsKind="years"
            years={data.confidentialityYears}
            yearsLabel="year(s) from Effective Date (trade secrets protected while they remain trade secrets)"
            otherKind="perpetual"
            otherLabel="In perpetuity"
            onChange={(kind, years) =>
              onChange({ ...data, confidentialityKind: kind, confidentialityYears: years })
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Governing Law" hint="State whose laws govern, e.g. Delaware">
            <input
              className={inputClass}
              value={data.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
            />
          </Field>
          <Field label="Jurisdiction" hint="City or county and state, e.g. New Castle, DE">
            <input
              className={inputClass}
              value={data.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
            />
          </Field>
        </div>

        <Field label="MNDA Modifications" hint="Optional. Any changes to the Standard Terms">
          <textarea
            className={inputClass}
            rows={2}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </Field>
      </Section>

      {([0, 1] as const).map((index) => (
        <Section key={index} title={`Party ${index + 1}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Print Name">
              <input
                className={inputClass}
                value={data.parties[index].name}
                onChange={(e) => setParty(index, "name", e.target.value)}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClass}
                value={data.parties[index].title}
                onChange={(e) => setParty(index, "title", e.target.value)}
              />
            </Field>
            <Field label="Company">
              <input
                className={inputClass}
                value={data.parties[index].company}
                onChange={(e) => setParty(index, "company", e.target.value)}
              />
            </Field>
            <Field label="Notice Address" hint="Email or postal address">
              <input
                className={inputClass}
                value={data.parties[index].noticeAddress}
                onChange={(e) => setParty(index, "noticeAddress", e.target.value)}
              />
            </Field>
          </div>
        </Section>
      ))}
    </form>
  );
}
