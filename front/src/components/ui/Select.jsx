import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  variant = "default", // default, ghost
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const buttonStyles =
    variant === "ghost"
      ? "w-full bg-transparent border-none p-0 text-left text-white focus:outline-none transition-all flex items-center justify-between"
      : "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-left text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all flex items-center justify-between";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonStyles}
      >
        <span className={selectedOption ? "text-white" : "text-zinc-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange({ target: { value: option.value } });
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors flex items-center justify-between group"
            >
              <span
                className={
                  option.value === value
                    ? "text-emerald-500 font-medium"
                    : "text-zinc-300 group-hover:text-white"
                }
              >
                {option.label}
              </span>
              {option.value === value && (
                <Check size={16} className="text-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
