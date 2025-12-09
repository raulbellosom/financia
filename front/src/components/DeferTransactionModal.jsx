import { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { useTransactions } from "../hooks/useTransactions";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export default function DeferTransactionModal({
  isOpen,
  onClose,
  transaction,
  account,
}) {
  const { t } = useTranslation();
  const { updateTransaction, createTransaction, isUpdating } =
    useTransactions();
  const [installments, setInstallments] = useState("3");
  const [canDefer, setCanDefer] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && transaction && account) {
      checkDeferrability();
      // Pre-fill with existing installments or default to 3
      setInstallments(
        transaction.installments && transaction.installments > 1
          ? String(transaction.installments)
          : "3"
      );
    }
  }, [isOpen, transaction, account]);

  const checkDeferrability = () => {
    if (!account.billingDay) {
      // If no billing day set, assume deferrable or maybe not?
      // Let's assume deferrable but warn user to set billing day.
      setCanDefer(true);
      return;
    }

    const txDate = new Date(transaction.date);
    const today = new Date();
    const billingDay = account.billingDay;

    // Calculate the billing date for the transaction's period
    let billingDate = new Date(
      txDate.getFullYear(),
      txDate.getMonth(),
      billingDay
    );

    // If the transaction was made AFTER the billing day in that month,
    // it belongs to the NEXT month's billing cycle.
    if (txDate.getDate() > billingDay) {
      billingDate.setMonth(billingDate.getMonth() + 1);
    }

    // Set billing date to end of day
    billingDate.setHours(23, 59, 59, 999);

    // If today is after the billing date, it's too late.
    setCanDefer(today <= billingDate);
  };

  const handleDefer = async () => {
    setIsProcessing(true);
    try {
      const numInstallments = parseInt(installments);

      // Update the transaction with the installments count
      // We keep the full amount on the transaction to reflect total debt
      await updateTransaction({
        id: transaction.$id,
        updates: {
          installments: numInstallments,
        },
      });

      toast.success(t("transactions.deferSuccess"));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("transactions.deferError"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-2">
          {t("transactions.deferTitle")}
        </h2>

        <div className="mb-6">
          <p className="text-zinc-400 text-sm">{transaction.description}</p>
          <p className="text-emerald-500 font-bold text-lg">
            ${transaction.amount.toLocaleString()}
          </p>
          <p className="text-zinc-500 text-xs">
            {new Date(transaction.date).toLocaleDateString()}
          </p>
        </div>

        {!canDefer ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-500 font-medium text-sm mb-1">
                {t("transactions.cannotDefer")}
              </h3>
              <p className="text-red-400/80 text-xs">
                {t("transactions.cannotDeferDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <p className="text-zinc-300 text-sm">
              {t("transactions.deferDesc")}
            </p>

            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                {t("transactions.months")}
              </label>
              <Select
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                options={[
                  { value: "1", label: t("transactions.noDefer") },
                  { value: "3", label: "3 Meses" },
                  { value: "6", label: "6 Meses" },
                  { value: "9", label: "9 Meses" },
                  { value: "12", label: "12 Meses" },
                  { value: "18", label: "18 Meses" },
                  { value: "24", label: "24 Meses" },
                  { value: "36", label: "36 Meses" },
                  { value: "48", label: "48 Meses" },
                  { value: "60", label: "60 Meses" },
                ]}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            {t("transactions.noDefer")}
          </Button>
          {canDefer && (
            <Button
              onClick={handleDefer}
              isLoading={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Check size={18} className="mr-2" />
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
