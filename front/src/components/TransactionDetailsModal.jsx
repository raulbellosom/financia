import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Tag,
  CreditCard,
  Repeat,
  FileText,
  Save,
} from "lucide-react";
import { Button } from "./Button";
import { Select } from "./ui/Select";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";
import { calculateInstallmentStatus } from "../utils/msiUtils";
import { databases } from "../lib/appwrite";
import { Query } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import toast from "react-hot-toast";

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  account,
  readOnly = false,
  allowDateEdit = false,
}) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();
  const { updateTransaction } = useTransactions();
  const { categories } = useCategories();

  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [recurringCount, setRecurringCount] = useState(null);
  const [recurringHistory, setRecurringHistory] = useState([]);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  useEffect(() => {
    if (transaction) {
      setNote(transaction.notes || "");
      setDate(
        transaction.date
          ? new Date(transaction.date).toISOString().split("T")[0]
          : ""
      );

      // Handle category being an object or an ID string
      const cat = transaction.category;
      const catId = cat && typeof cat === "object" ? cat.$id : cat;
      setCategoryId(catId || "");

      if (transaction.origin === "recurring") {
        fetchRecurringDetails();
      } else {
        setRecurringCount(null);
        setRecurringHistory([]);
        setNextPaymentDate(null);
      }
    }
  }, [transaction]);

  const fetchRecurringDetails = async () => {
    setIsLoadingCount(true);
    try {
      // Query for similar recurring transactions (History)
      const historyResponse = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        [
          Query.equal("profile", transaction.profile),
          Query.equal("origin", "recurring"),
          Query.equal("description", transaction.description),
          Query.equal("amount", transaction.amount),
          Query.equal("isDeleted", false),
          Query.orderDesc("date"),
          Query.limit(10),
        ]
      );
      setRecurringCount(historyResponse.total);
      setRecurringHistory(historyResponse.documents);

      // Query for the recurring rule to find next payment
      // We try to match by name/description since we might not have the rule ID directly
      const rulesResponse = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECURRING_RULES_COLLECTION_ID,
        [
          Query.equal("profile", transaction.profile),
          Query.equal("name", transaction.description),
          Query.equal("isActive", true),
          Query.limit(1),
        ]
      );

      if (rulesResponse.documents.length > 0) {
        setNextPaymentDate(rulesResponse.documents[0].nextRun);
      } else {
        setNextPaymentDate(null);
      }
    } catch (error) {
      console.error("Error fetching recurring details:", error);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const isCreatedToday = () => {
    if (!transaction?.$createdAt) return false;
    const created = new Date(transaction.$createdAt);
    const today = new Date();
    return (
      created.getDate() === today.getDate() &&
      created.getMonth() === today.getMonth() &&
      created.getFullYear() === today.getFullYear()
    );
  };

  const canEditDate = allowDateEdit && isCreatedToday() && !readOnly;

  const handleSave = async () => {
    try {
      const updates = {
        notes: note,
        category: categoryId || null,
      };

      if (canEditDate && date) {
        const originalDate = new Date(transaction.date);
        const [year, month, day] = date.split("-").map(Number);
        const newDate = new Date(originalDate);
        newDate.setFullYear(year);
        newDate.setMonth(month - 1);
        newDate.setDate(day);
        updates.date = newDate.toISOString();
      }

      await updateTransaction({
        id: transaction.$id,
        updates,
      });
      toast.success(t("common.saved"));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  };

  if (!isOpen || !transaction) return null;

  // If account is not passed, try to use the one from transaction if populated
  const effectiveAccount =
    account ||
    (transaction.account && transaction.account.$id
      ? transaction.account
      : null);

  const msiStatus =
    effectiveAccount && transaction.installments > 1
      ? calculateInstallmentStatus(transaction, effectiveAccount)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">
            {transaction.description === "recurring.payment"
              ? t("transactions.recurringPayment")
              : transaction.description || t("common.noDescription")}
          </h2>
          <p
            className={`text-2xl font-bold ${
              transaction.type === "income" ? "text-emerald-500" : "text-white"
            }`}
          >
            {transaction.type === "income" ? "+" : "-"}$
            {transaction.amount.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-zinc-800/50 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Calendar size={14} />
                <span>{t("common.date")}</span>
              </div>
              {canEditDate ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-none text-zinc-200 font-medium p-0 focus:ring-0 w-full scheme-dark cursor-pointer"
                />
              ) : (
                <p className="text-zinc-200 font-medium">
                  {formatDate(transaction.date)}
                </p>
              )}
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Tag size={14} />
                <span>{t("common.category")}</span>
              </div>
              {readOnly ? (
                <p className="text-zinc-200 font-medium">
                  {categories?.find((c) => c.$id === categoryId)?.name ||
                    t("common.uncategorized")}
                </p>
              ) : (
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder={t("common.uncategorized")}
                  variant="ghost"
                  options={[
                    { value: "", label: t("common.uncategorized") },
                    ...(categories?.map((cat) => ({
                      value: cat.$id,
                      label: cat.name,
                    })) || []),
                  ]}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Recurring Info */}
          {transaction.origin === "recurring" && (
            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Repeat size={18} />
                  <h3 className="font-semibold">
                    {t("transactions.recurring")}
                  </h3>
                </div>
                {nextPaymentDate && (
                  <div className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-lg">
                    {t("common.nextPayment")}: {formatDate(nextPaymentDate)}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-zinc-300 text-sm font-medium">
                  {isLoadingCount
                    ? t("common.loading")
                    : t("common.paymentCount", { count: recurringCount })}
                </p>

                {recurringHistory.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                      {t("common.paymentHistory")}
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {recurringHistory.map((hist) => (
                        <div
                          key={hist.$id}
                          className={`flex justify-between text-xs p-2 rounded-lg ${
                            hist.$id === transaction.$id
                              ? "bg-purple-500/20 border border-purple-500/30 text-white"
                              : "bg-zinc-900/50 text-zinc-400"
                          }`}
                        >
                          <span>{formatDate(hist.date)}</span>
                          <span
                            className={
                              hist.type === "income"
                                ? "text-emerald-500"
                                : "text-zinc-300"
                            }
                          >
                            {hist.type === "income" ? "+" : "-"}$
                            {hist.amount.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MSI Info */}
          {msiStatus && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <CreditCard size={18} />
                <h3 className="font-semibold">{t("transactions.msiTitle")}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">
                    {t("transactions.progress")}
                  </span>
                  <span className="text-white font-medium">
                    {msiStatus.currentInstallment} /{" "}
                    {msiStatus.totalInstallments}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (msiStatus.currentInstallment /
                          msiStatus.totalInstallments) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 pt-1">
                  <span>
                    {t("transactions.monthlyAmount")}: $
                    {msiStatus.monthlyAmount.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span>
                    {msiStatus.isPaidOff
                      ? t("transactions.paid")
                      : t("transactions.active")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
              <FileText size={16} />
              {t("common.notes")}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              readOnly={readOnly}
              placeholder={readOnly ? "" : t("transactions.addNotePlaceholder")}
              className={`w-full h-24 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none resize-none ${
                readOnly ? "focus:border-zinc-800" : ""
              }`}
            />
          </div>

          {!readOnly && (
            <Button onClick={handleSave} className="w-full">
              <Save size={18} className="mr-2" />
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
