import { useState } from "react";
import { ArrowRightLeft, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "../components/ui/Button";
import TransactionModal from "../components/TransactionModal";
import PageLayout from "../components/PageLayout";
import { useTransactions } from "../hooks/useTransactions";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

export default function Transactions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { transactions, isLoading } = useTransactions();
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {transactions.map((tx) => (
            <div
              key={tx.$id}
              className="flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
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
                  <p className="text-sm text-zinc-500">{formatDate(tx.date)}</p>
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
          ))}
        </div>
      )}

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </PageLayout>
  );
}
