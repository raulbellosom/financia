import { Filter, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTranslation } from "react-i18next";
import { formatAccountLabel } from "../utils/accountUtils";

export default function TransactionFilters({
  accountId,
  categoryId,
  type,
  includeDrafts,
  onFilterChange,
  onClearFilters,
}) {
  const { t } = useTranslation();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const accountOptions = [
    { value: "", label: t("reports.allAccounts") },
    ...accounts.map((acc) => ({
      value: acc.$id,
      label: formatAccountLabel(acc),
    })),
  ];

  const filteredCategories = type
    ? categories.filter((c) => c.type === type)
    : categories;

  const categoryOptions = [
    { value: "", label: t("reports.allCategories") },
    ...filteredCategories.map((cat) => ({
      value: cat.$id,
      label: cat.name,
    })),
  ];

  const typeOptions = [
    { value: "", label: t("reports.allTypes") },
    { value: "income", label: t("transactions.income") },
    { value: "expense", label: t("transactions.expense") },
    { value: "transfer", label: t("transactions.transfer") },
  ];

  const hasActiveFilters = accountId || categoryId || type || includeDrafts;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-zinc-400" />
          <h3 className="text-white font-medium">{t("reports.filters")}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
          >
            <X size={16} className="mr-2" />
            {t("reports.clearFilters")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Account Filter */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            {t("reports.account")}
          </label>
          <Select
            value={accountId || ""}
            onChange={(e) =>
              onFilterChange("accountId", e.target.value || null)
            }
            options={accountOptions}
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            {t("reports.category")}
          </label>
          <Select
            value={categoryId || ""}
            onChange={(e) =>
              onFilterChange("categoryId", e.target.value || null)
            }
            options={categoryOptions}
          />
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            {t("reports.type")}
          </label>
          <Select
            value={type || ""}
            onChange={(e) => onFilterChange("type", e.target.value || null)}
            options={typeOptions}
          />
        </div>
      </div>

      {/* Show Drafts Toggle */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="includeDrafts"
          checked={includeDrafts}
          onChange={(e) => onFilterChange("includeDrafts", e.target.checked)}
          className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-emerald-500"
        />
        <label htmlFor="includeDrafts" className="text-sm text-zinc-400">
          {t("reports.includeDrafts")}
        </label>
      </div>
    </div>
  );
}
