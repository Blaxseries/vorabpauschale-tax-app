"use client";

import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  flagEmojiForRegion,
} from "@/lib/geo-options";

type CountrySelectProps = {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
};

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
};

export function CountrySelect({
  value,
  onChange,
  id,
  required,
  className,
}: CountrySelectProps) {
  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {COUNTRY_OPTIONS.map((country) => (
        <option key={country.code} value={country.code}>
          {country.flag} {country.name} ({country.code})
        </option>
      ))}
    </select>
  );
}

export function CurrencySelect({
  value,
  onChange,
  id,
  required,
  className,
}: CurrencySelectProps) {
  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {CURRENCY_OPTIONS.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {flagEmojiForRegion(currency.flagRegion)} {currency.code} – {currency.name}
        </option>
      ))}
    </select>
  );
}
