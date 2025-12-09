import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  ArrowRightLeft,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import PageLayout from "../components/PageLayout";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, isLoading: transactionsLoading } = useTransactions(5);
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.type === "credit") {
      return sum - acc.currentBalance;
    }
    return sum + acc.currentBalance;
  }, 0);

  const getAccountType = (accountId) => {
    // Handle both expanded object and ID string
    const id = accountId?.$id || accountId;
    const account = accounts.find((a) => a.$id === id);
    return account ? account.type : "cash";
  };

  const income = transactions
    .filter((t) => t.type === "income")
    .filter((t) => getAccountType(t.account) !== "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const isLoading = accountsLoading || transactionsLoading;

  return (
    <PageLayout
      title={t("dashboard.hello", {
        name: user?.name?.split(" ")[0] || "User",
      })}
      subtitle={t("dashboard.subtitle")}
      icon={LayoutDashboard}
      action={
        <Link to="/transactions">
          <Button
            size="icon"
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
          >
            <Plus size={24} />
          </Button>
        </Link>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
              <Wallet size={20} />
            </div>
            <span className="text-zinc-400 font-medium">
              {t("dashboard.totalBalance")}
            </span>
          </div>
          <p className="text-3xl font-bold text-white">
            {isLoading
              ? "..."
              : `$${totalBalance.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}`}
          </p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <span className="text-zinc-400 font-medium">
              {t("dashboard.incomeRecent")}
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">
            {isLoading
              ? "..."
              : `+$${income.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}`}
          </p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-full text-rose-500">
              <TrendingDown size={20} />
            </div>
            <span className="text-zinc-400 font-medium">
              {t("dashboard.expensesRecent")}
            </span>
          </div>
          <p className="text-3xl font-bold text-rose-500">
            {isLoading
              ? "..."
              : `-$${expenses.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}`}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {t("dashboard.recentActivity")}
          </h2>
          <Link to="/transactions">
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-500 hover:text-emerald-400"
            >
              {t("common.seeAll")}
            </Button>
          </Link>
        </div>

        <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
          {isLoading ? (
            <div className="text-zinc-500 text-center py-8">
              {t("common.loading")}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">
              {t("dashboard.noActivity")}
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.$id}
                onClick={() => {
                  setSelectedTransaction(tx);
                  setDetailsModalOpen(true);
                }}
                className="flex items-center justify-between p-4 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                  <div>
                    <p className="font-medium text-white">
                      {tx.description || t("common.untitled")}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold ${
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
              </div>
            ))
          )}
        </div>
      </div>

      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        readOnly={true}
      />
    </PageLayout>
  );
}
