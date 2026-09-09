"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  mapChurchTaxRateToKirchensteuer,
  mapKirchensteuerToChurchTaxRate,
  type KirchensteuerOption,
} from "@/lib/tax-year-options";
import { supabase } from "@/lib/supabase";

type TaxYearSteuerparameterProps = {
  taxYearId: string;
  initialFreistellungsauftrag: number;
  initialChurchTaxRate: number | null;
  initialSolidaritaetszuschlag: boolean;
};

export function TaxYearSteuerparameterForm({
  taxYearId,
  initialFreistellungsauftrag,
  initialChurchTaxRate,
  initialSolidaritaetszuschlag,
}: TaxYearSteuerparameterProps) {
  const [freistellungsauftrag, setFreistellungsauftrag] = useState(
    String(initialFreistellungsauftrag ?? 0),
  );
  const [kirchensteuer, setKirchensteuer] = useState<KirchensteuerOption>(
    mapChurchTaxRateToKirchensteuer(initialChurchTaxRate),
  );
  const [solidaritaetszuschlag, setSolidaritaetszuschlag] = useState(
    initialSolidaritaetszuschlag,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(freistellungsauftrag.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      setErrorMessage("Bitte einen gültigen Freistellungsauftrag (≥ 0) angeben.");
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);

    const { error } = await supabase
      .from("tax_years")
      .update({
        freistellungsauftrag: amount,
        church_tax_rate: mapKirchensteuerToChurchTaxRate(kirchensteuer),
        solidaritaetszuschlag,
      })
      .eq("id", taxYearId);

    setIsSaving(false);
    if (error) {
      setErrorMessage("Steuerparameter konnten nicht gespeichert werden.");
      return;
    }
    setMessage("Steuerparameter gespeichert.");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <label className="block text-sm text-zinc-700">
        Freistellungsauftrag (EUR)
        <input
          type="number"
          min={0}
          step="0.01"
          value={freistellungsauftrag}
          onChange={(event) => setFreistellungsauftrag(event.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-zinc-500">
          Gilt mandantenübergreifend für alle Depots dieses Steuerjahres, nicht je Depot.
        </span>
      </label>

      <label className="block text-sm text-zinc-700">
        Kirchensteuer
        <select
          value={kirchensteuer}
          onChange={(event) => setKirchensteuer(event.target.value as KirchensteuerOption)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="none">keine</option>
          <option value="8">8 %</option>
          <option value="9">9 %</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={solidaritaetszuschlag}
          onChange={(event) => setSolidaritaetszuschlag(event.target.checked)}
          className="rounded border-zinc-300"
        />
        Solidaritätszuschlag
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-70"
      >
        {isSaving ? "Speichert..." : "Steuerparameter speichern"}
      </button>
    </form>
  );
}
