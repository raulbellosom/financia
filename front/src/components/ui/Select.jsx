import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({
    opacity: 0,
    visibility: "hidden",
  });

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate position when opening
  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      setDropdownStyle({
        top: `${rect.bottom + scrollY + 4}px`,
        left: `${rect.left + scrollX}px`,
        minWidth: `${rect.width}px`,
        maxWidth: "90vw", // Prevent overflow on mobile
        opacity: 1,
        visibility: "visible",
      });

      // Focus input
      if (inputRef.current) {
        requestAnimationFrame(() => inputRef.current.focus());
      }
    } else {
      // Reset style when closed
      setDropdownStyle({ opacity: 0, visibility: "hidden" });
    }
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    const handleScroll = (event) => {
      if (!isOpen) return;

      // If it's a resize event, always close
      if (event.type === "resize") {
        setIsOpen(false);
        return;
      }

      // If it's a scroll event, check if it's inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }

      setIsOpen(false); // Close on outside scroll to avoid detached dropdown
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
    setSearchQuery("");
  };

  const buttonStyles =
    variant === "ghost"
      ? "w-full bg-transparent border-none p-0 text-left text-white focus:outline-none transition-all flex items-center justify-between"
      : "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-left text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all flex items-center justify-between h-11";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonStyles}
      >
        <span
          className={`truncate ${
            selectedOption ? "text-white" : "text-zinc-500"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform flex-shrink-0 ml-2 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="absolute z-[9999] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Input - Improved Styling */}
            <div className="p-2 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
              <div className="relative group">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-zinc-950 transition-all placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="w-full px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors flex items-center justify-between group border-b border-zinc-800/30 last:border-0"
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
                      <Check
                        size={14}
                        className="text-emerald-500 ml-3 flex-shrink-0"
                      />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
                  <Search size={20} className="opacity-20" />
                  <span>No results found</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
