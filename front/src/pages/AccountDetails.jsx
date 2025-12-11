import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactionReports } from "../hooks/useTransactionReports";
import { useTransactions } from "../hooks/useTransactions";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";
import { getQuickPeriods, groupTransactionsByDate } from "../utils/dateUtils";
import { calculateInstallmentStatus } from "../utils/msiUtils";
import PageLayout from "../components/PageLayout";
import PeriodSelector from "../components/PeriodSelector";
import SummaryCards from "../components/SummaryCards";
import { Button } from "../components/ui/Button";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  Calendar,
  DollarSign,
  Clock,
  Trash2,
} from "lucide-react";
import TransactionModal from "../components/TransactionModal";
import DeferTransactionModal from "../components/DeferTransactionModal";
import DeleteConfirmationModal from "../components/ui/DeleteConfirmationModal";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import NotFound from "./NotFound";

export default function AccountDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { deleteTransaction } = useTransactions();

  const account = accounts.find((a) => a.$id === id);

  // Period state
  const quickPeriods = getQuickPeriods();
  const [startDate, setStartDate] = useState(quickPeriods.thisMonth.startDate);
  const [endDate, setEndDate] = useState(quickPeriods.thisMonth.endDate);

  // Filter state
  const [activeTab, setActiveTab] = useState("all"); // all, expense, income

  // Defer Modal State
  const [deferModalOpen, setDeferModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetailsTransaction, setSelectedDetailsTransaction] =
    useState(null);

  // Fetch reports
  const { transactions, totals, isLoading } = useTransactionReports({
    startDate,
    endDate,
    accountId: id,
    type: activeTab === "all" ? null : activeTab,
    includeDrafts: false,
  });

  // Group transactions
  const groupedTransactions = groupTransactionsByDate(transactions);
  const dateKeys = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a)
  );

  if (!account) {
    return <NotFound />;
  }

  const handlePeriodChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Calculate "Payment for Period" (Pago para no generar intereses)
  // This sums up:
  // 1. Full amount of non-deferred expenses in this period
  // 2. Monthly installment amount of deferred expenses active in this period
  const calculatePeriodPayment = () => {
    if (!transactions || account.type !== "credit") return 0;

    let totalPayment = 0;

    transactions.forEach((tx) => {
      if (tx.type === "expense") {
        const msiStatus = calculateInstallmentStatus(tx, account);

        if (msiStatus) {
          // If it's an installment plan, add ONLY the monthly amount
          // But only if the installment is active (not paid off)
          if (!msiStatus.isPaidOff) {
            totalPayment += msiStatus.monthlyAmount;
          }
        } else {
          // Normal transaction: Add full amount
          totalPayment += tx.amount;
        }
      }
    });

    return totalPayment;
  };

  const periodPayment = calculatePeriodPayment();

  return (
    <PageLayout
      title={account.name}
      subtitle={t("accounts.detailsSubtitle")}
      icon={account.type === "credit" ? CreditCard : Wallet}
      action={
        <Button
          onClick={() => navigate("/accounts")}
          className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          <ArrowLeft size={20} className="mr-2" />
          {t("common.back")}
        </Button>
      }
    >
      {/* Account Header */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 mb-8">
        <div className="flex flex-col gap-8">
          {/* Main Balances Row */}
          <div className="flex flex-wrap gap-12 items-end">
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">
                {t("accounts.currentBalance")}
              </p>
              <p className="text-4xl font-bold text-white tracking-tight">
                $
                {account.currentBalance.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            {account.type === "credit" && (
              <div>
                <p className="text-sm font-medium text-zinc-400 mb-2">
                  Pago del Periodo
                </p>
                <p className="text-4xl font-bold text-emerald-400 tracking-tight">
                  $
                  {periodPayment.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Credit Card Details Row */}
          {account.type === "credit" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-zinc-800/50">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  {t("accounts.creditLimitLabel")}
                </p>
                <p className="text-xl font-semibold text-zinc-200">
                  $
                  {account.creditLimit?.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  {t("accounts.billingDayLabel")}
                </p>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Calendar size={18} className="text-zinc-400" />
                  <span className="font-medium">
                    {t("accounts.day", { day: account.billingDay })}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  {t("accounts.dueDayLabel")}
                </p>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Calendar size={18} className="text-zinc-400" />
                  <span className="font-medium">
                    {t("accounts.day", { day: account.dueDay })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-zinc-900 p-1 rounded-xl">
          {["all", "expense", "income"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab === "all"
                ? t("common.all")
                : tab === "expense"
                ? t("common.expense")
                : t("common.income")}
            </button>
          ))}
        </div>

        <PeriodSelector
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {/* Summary Cards */}
      <SummaryCards totals={totals} isLoading={isLoading} />

      {/* Transactions List */}
      <div className="space-y-8 mt-8">
        {isLoading ? (
          <div className="text-center text-zinc-500 py-12">
            {t("common.loading")}
          </div>
        ) : dateKeys.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            {t("transactions.noTransactions")}
          </div>
        ) : (
          dateKeys.map((date) => (
            <div key={date}>
              <h3 className="text-zinc-500 text-sm font-medium mb-3 sticky top-0 bg-black/95 py-2 z-10">
                {formatDate(date)}
              </h3>
              <div className="space-y-2">
                {groupedTransactions[date].map((transaction) => (
                  <div
                    key={transaction.$id}
                    onClick={() => {
                      setSelectedDetailsTransaction(transaction);
                      setDetailsModalOpen(true);
                    }}
                    className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 rounded-2xl p-4 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            transaction.type === "income"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          <DollarSign size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate">
                            {transaction.description ||
                              t("common.noDescription")}
                          </p>
                          <p className="text-sm text-zinc-500 truncate">
                            {(() => {
                              const cat = transaction.category;
                              if (!cat) return t("common.uncategorized");
                              if (typeof cat === "object") return cat.name;
                              // It's an ID
                              const foundCat = categories?.find(
                                (c) => c.$id === cat
                              );
                              return foundCat
                                ? foundCat.name
                                : t("common.uncategorized");
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p
                          className={`font-bold ${
                            transaction.type === "income"
                              ? "text-emerald-500"
                              : "text-white"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}$
                          {transaction.amount.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </p>

                        {/* MSI Status Display */}
                        {(() => {
                          const msiStatus = calculateInstallmentStatus(
                            transaction,
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

                        <div className="flex items-center justify-end gap-2 mt-2">
                          {account.type === "credit" &&
                            transaction.type === "expense" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(transaction);
                                  setDeferModalOpen(true);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                title={
                                  transaction.installments > 1
                                    ? "Editar MSI"
                                    : t("transactions.defer")
                                }
                              >
                                <Clock size={14} />
                                {transaction.installments > 1
                                  ? "Editar MSI"
                                  : t("transactions.defer")}
                              </button>
                            )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransactionToDelete(transaction);
                              setDeleteModalOpen(true);
                            }}
                            className="text-zinc-500 hover:text-red-500 transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          if (transactionToDelete) {
            await deleteTransaction(transactionToDelete.$id);
            setDeleteModalOpen(false);
            setTransactionToDelete(null);
          }
        }}
        title={t("transactions.deleteTitle")}
        description={t("transactions.deleteDesc")}
      />

      <DeferTransactionModal
        isOpen={deferModalOpen}
        onClose={() => {
          setDeferModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        account={account}
      />

      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedDetailsTransaction(null);
        }}
        transaction={selectedDetailsTransaction}
        account={account}
        allowDateEdit={true}
      />
    </PageLayout>
  );
}
