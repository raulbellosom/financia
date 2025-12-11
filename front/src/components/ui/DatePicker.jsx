import { useRef } from "react";
import { Calendar } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "react-i18next";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
  error,
  ...props
}) {
  const { t, i18n } = useTranslation();
  const inputRef = useRef(null);

  const handleDivClick = () => {
    if (inputRef.current) {
      // Try showPicker first (modern browsers)
      if (typeof inputRef.current.showPicker === "function") {
        inputRef.current.showPicker();
      } else {
        // Fallback for older browsers: focus and click
        inputRef.current.focus();
        inputRef.current.click();
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("common.selectDate");
    const date = new Date(dateString + "T00:00:00"); // Append time to avoid timezone issues
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-zinc-400">{label}</label>
      )}
      <div className="relative group">
        <div
          onClick={handleDivClick}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer transition-all hover:bg-zinc-900 hover:border-zinc-700",
            error && "border-red-500/50 hover:border-red-500"
          )}
        >
          <span
            className={cn(
              "text-sm",
              !value ? "text-zinc-500" : "text-zinc-200"
            )}
          >
            {value ? formatDate(value) : t("common.selectDate")}
          </span>
          <Calendar
            size={18}
            className="text-zinc-400 group-hover:text-zinc-300"
          />
        </div>
        <input
          ref={inputRef}
          type="date"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          value={value}
          onChange={onChange}
          tabIndex={-1}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
