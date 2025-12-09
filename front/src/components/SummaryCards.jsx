import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "../utils/reportUtils";
import { useTranslation } from "react-i18next";

export default function SummaryCards({
  totals,
  currency = "MXN",
  isLoading = false,
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse"
          >
            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-zinc-800 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("reports.totalIncome"),
      amount: totals.income,
      icon: TrendingUp,
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
      iconColor: "text-blue-500",
    },
    {
      title: t("reports.totalExpenses"),
      amount: totals.expenses,
      icon: TrendingDown,
      bgColor: "bg-red-500/10",
      textColor: "text-red-500",
      iconColor: "text-red-500",
    },
    {
      title: t("reports.netBalance"),
      amount: totals.net,
      icon: DollarSign,
      bgColor: totals.net >= 0 ? "bg-emerald-500/10" : "bg-orange-500/10",
      textColor: totals.net >= 0 ? "text-emerald-500" : "text-orange-500",
      iconColor: totals.net >= 0 ? "text-emerald-500" : "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm font-medium">{card.title}</p>
            <div
              className={`w-10 h-10 rounded-full ${card.bgColor} flex items-center justify-center`}
            >
              <card.icon size={20} className={card.iconColor} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${card.textColor}`}>
            {card.amount >= 0 ? "" : "-"}
            {formatCurrency(Math.abs(card.amount), currency)}
          </p>
          {index === 2 && (
            <p className="text-xs text-zinc-500 mt-2">
              {totals.count} {t("reports.transactions")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
