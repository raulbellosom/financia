import { useState } from "react";
import {
  ArrowRightLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  FileText,
  Repeat,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import TransactionModal from "../components/TransactionModal";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import PageLayout from "../components/PageLayout";
import PeriodSelector from "../components/PeriodSelector";
import TransactionFilters from "../components/TransactionFilters";
import SummaryCards from "../components/SummaryCards";
import { useTransactionReports } from "../hooks/useTransactionReports";
import { useCategories } from "../hooks/useCategories";
import { useAccounts } from "../hooks/useAccounts";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";
import { getQuickPeriods, groupTransactionsByDate } from "../utils/dateUtils";
import { calculateInstallmentStatus } from "../utils/msiUtils";

export default function Transactions() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetailsTransaction, setSelectedDetailsTransaction] =
    useState(null);

  // Period state
  const quickPeriods = getQuickPeriods();
  const [startDate, setStartDate] = useState(quickPeriods.thisMonth.startDate);
  const [endDate, setEndDate] = useState(quickPeriods.thisMonth.endDate);

  // Filter state
  const [accountId, setAccountId] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [type, setType] = useState(null);
  const [includeDrafts, setIncludeDrafts] = useState(false);

  // Fetch reports
  const { transactions, totals, isLoading } = useTransactionReports({
    startDate,
    endDate,
    accountId,
    categoryId,
    type,
    includeDrafts,
  });

  // Group transactions by date
  const groupedTransactions = groupTransactionsByDate(transactions);
  const dateKeys = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a)
  );

  // Handle period change
  const handlePeriodChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    switch (filterName) {
      case "accountId":
        setAccountId(value);
        break;
      case "categoryId":
        setCategoryId(value);
        break;
      case "type":
        setType(value);
        break;
      case "includeDrafts":
        setIncludeDrafts(value);
        break;
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setAccountId(null);
    setCategoryId(null);
    setType(null);
    setIncludeDrafts(false);
  };

  // Get origin badge
  const getOriginBadge = (origin) => {
    if (origin === "recurring") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded-full">
          <Repeat size={12} />
          {t("transactions.recurring")}
        </span>
      );
    }
    if (origin === "ocr") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-500 text-xs rounded-full">
          <FileText size={12} />
          {t("transactions.ocr")}
        </span>
      );
    }
    return null;
  };

  return (
    <PageLayout
      title={t("transactions.title")}
      subtitle={t("transactions.subtitle")}
      icon={ArrowRightLeft}
      action={
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
        >
          <Plus size={20} className="mr-2" />
          {t("transactions.newTransaction")}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <PeriodSelector
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={handlePeriodChange}
        />

        {/* Filters */}
        <TransactionFilters
          accountId={accountId}
          categoryId={categoryId}
          type={type}
          includeDrafts={includeDrafts}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Summary Cards */}
        <SummaryCards totals={totals} isLoading={isLoading} />

        {/* Transaction List */}
        {isLoading ? (
          <div className="text-center text-zinc-500 py-12">
            {t("transactions.loading")}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <ArrowRightLeft size={32} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              {t("transactions.noTransactions")}
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              {t("transactions.noTransactionsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dateKeys.map((dateKey) => (
              <div
                key={dateKey}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                {/* Date Header */}
                <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800">
                  <p className="text-sm font-medium text-zinc-400">
                    {formatDate(dateKey)}
                  </p>
                </div>

                {/* Transactions for this date */}
                {groupedTransactions[dateKey].map((tx) => (
                  <div
                    key={tx.$id}
                    onClick={() => {
                      setSelectedDetailsTransaction(tx);
                      setDetailsModalOpen(true);
                    }}
                    className="flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === "income"
                            ? "bg-blue-500/10 text-blue-500"
                            : tx.type === "expense"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <TrendingUp size={20} />
                        ) : tx.type === "expense" ? (
                          <TrendingDown size={20} />
                        ) : (
                          <ArrowRightLeft size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white truncate max-w-full">
                            {tx.description || t("common.untitled")}
                          </p>
                          {tx.isDraft && (
                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">
                              {t("transactions.draft")}
                            </span>
                          )}
                          {getOriginBadge(tx.origin)}
                        </div>
                        {tx.notes && (
                          <p className="text-sm text-zinc-500 truncate">
                            {tx.notes}
                          </p>
                        )}
                        <p className="text-sm text-zinc-500 truncate">
                          {(() => {
                            if (!tx.category) return t("common.uncategorized");
                            if (typeof tx.category === "object")
                              return tx.category.name;
                            const cat = categories.find(
                              (c) => c.$id === tx.category
                            );
                            return cat ? cat.name : t("common.uncategorized");
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <span
                        className={`font-bold text-lg ${
                          tx.type === "income"
                            ? "text-blue-500"
                            : tx.type === "expense"
                            ? "text-white"
                            : "text-zinc-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}$
                        {tx.amount.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      {/* MSI Status Display */}
                      {(() => {
                        const account = accounts.find(
                          (a) => a.$id === (tx.account?.$id || tx.account)
                        );
                        if (!account) return null;

                        const msiStatus = calculateInstallmentStatus(
                          tx,
                          account
                        );
                        if (msiStatus) {
                          return (
                            <div className="flex flex-col items-end mt-1">
                              <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                {msiStatus.currentInstallment}/
                                {msiStatus.totalInstallments} MSI
                              </span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">
                                $
                                {msiStatus.monthlyAmount.toLocaleString(
                                  "es-MX",
                                  { minimumFractionDigits: 2 }
                                )}{" "}
                                / mes
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedDetailsTransaction(null);
        }}
        transaction={selectedDetailsTransaction}
        allowDateEdit={true}
      />
    </PageLayout>
  );
}
