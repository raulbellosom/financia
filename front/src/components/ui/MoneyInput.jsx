import { forwardRef, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

const sanitizeMoneyInput = (value) => {
  if (value == null) return "";

  // Accept common money formats while typing, then normalize to a plain
  // decimal string that `parseFloat` can handle.
  // Examples:
  // - "$23,450.02" -> "23450.02"
  // - "23.450,02" -> "23450.02"
  // - "23450.02"  -> "23450.02"
  const raw = String(value);

  // Keep only digits and separators.
  const cleaned = raw.replace(/[^0-9.,]/g, "");
  if (cleaned.trim() === "") return "";

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  // Decide which is the decimal separator: the last separator wins.
  let decimalSeparator = null;
  if (hasDot || hasComma) {
    decimalSeparator = lastDot > lastComma ? "." : ",";
  }

  let intPart = cleaned;
  let decPart = "";

  if (decimalSeparator) {
    const splitIndex = cleaned.lastIndexOf(decimalSeparator);
    intPart = cleaned.slice(0, splitIndex);
    decPart = cleaned.slice(splitIndex + 1);
  }

  // Remove any other separators (thousands/grouping) from both parts.
  intPart = intPart.replace(/[.,]/g, "");
  decPart = decPart.replace(/[.,]/g, "");

  const normalizedInt = intPart === "" ? "0" : intPart;
  const normalized =
    decPart.length > 0 ? `${normalizedInt}.${decPart}` : normalizedInt;

  // Avoid leading dot (e.g. ".5")
  if (normalized.startsWith(".")) return `0${normalized}`;
  return normalized;
};

const formatMoney = (amount, currency, locale) => {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const MoneyInput = forwardRef(
  (
    {
      className,
      label,
      error,
      value,
      onChange,
      onValueChange,
      currency = "MXN",
      locale = "es-MX",
      inputMode = "decimal",
      placeholder = "0.00",
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const rawValue = value == null ? "" : String(value);

    const formattedValue = useMemo(() => {
      if (isFocused) return rawValue;
      if (rawValue.trim() === "") return "";
      const parsed = Number.parseFloat(rawValue);
      if (!Number.isFinite(parsed)) return rawValue;
      return formatMoney(parsed, currency, locale);
    }, [currency, isFocused, locale, rawValue]);

    const handleChange = (e) => {
      const sanitized = sanitizeMoneyInput(e.target.value);

      onValueChange?.(sanitized);

      if (onChange) {
        // React SyntheticEvent targets (DOM nodes) aren't safely spreadable.
        // Emit a minimal event-like shape that preserves `target.name` + `target.value`.
        const name = props.name ?? e.target?.name;
        onChange({
          target: {
            name,
            value: sanitized,
          },
          currentTarget: {
            name,
            value: sanitized,
          },
        });
      }
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-zinc-400">{label}</label>
        )}
        <input
          ref={ref}
          inputMode={inputMode}
          type="text"
          className={twMerge(
            "flex h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-100 ring-offset-zinc-950 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          value={formattedValue}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={handleChange}
          placeholder={placeholder}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

MoneyInput.displayName = "MoneyInput";
