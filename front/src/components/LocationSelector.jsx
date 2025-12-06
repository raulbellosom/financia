import { useState, useEffect } from "react";
import { Input } from "./Input";
import { Search, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LocationSelector({
  onSelect,
  initialCountry = "MX",
  initialState = "",
}) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("country"); // 'country' or 'state'
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/countries.json")
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
        const defaultCountry = data.find((c) => c.code2 === initialCountry);
        if (defaultCountry) {
          setSelectedCountry(defaultCountry);
          if (initialState) {
            const defaultState = defaultCountry.states.find(
              (s) => s.code === initialState || s.name === initialState
            );
            if (defaultState) setSelectedState(defaultState);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load countries:", err);
        setLoading(false);
      });
  }, [initialCountry, initialState]);

  const filteredItems =
    mode === "country"
      ? countries.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : selectedCountry?.states.filter((s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

  const handleSelect = (item) => {
    if (mode === "country") {
      setSelectedCountry(item);
      setSelectedState(null);
      onSelect({ country: item.code2, state: null });
      if (item.states && item.states.length > 0) {
        setMode("state");
        setSearchQuery("");
      } else {
        setIsOpen(false);
      }
    } else {
      setSelectedState(item);
      onSelect({
        country: selectedCountry.code2,
        state: item.code || item.name,
      });
      setIsOpen(false);
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setMode("country");
      setSearchQuery("");
    } else {
      setIsOpen(false);
    }
  };

  if (loading)
    return <div className="animate-pulse h-12 bg-zinc-800 rounded-xl"></div>;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-zinc-400 mb-1">
        {t("components.locationSelector.label")}
      </label>
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
      >
        <span className={!selectedCountry ? "text-zinc-500" : ""}>
          {selectedCountry
            ? `${selectedCountry.name}${
                selectedState ? `, ${selectedState.name}` : ""
              }`
            : t("components.locationSelector.selectCountry")}
        </span>
        <ChevronDown size={20} className="text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-zinc-800">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder={t("components.locationSelector.search", {
                  mode:
                    mode === "country"
                      ? t("components.locationSelector.modeCountry")
                      : t("components.locationSelector.modeState"),
                })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {mode === "state" && (
              <button
                type="button"
                onClick={() => {
                  setMode("country");
                  setSearchQuery("");
                }}
                className="w-full text-left px-4 py-2 text-sm text-emerald-500 hover:bg-zinc-800"
              >
                ← {t("components.locationSelector.back")}
              </button>
            )}

            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                {t("components.locationSelector.noResults")}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.code2 || item.code || item.name}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-sm text-zinc-300">{item.name}</span>
                  {(selectedCountry?.code2 === item.code2 ||
                    selectedState?.code === item.code) && (
                    <Check size={16} className="text-emerald-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
