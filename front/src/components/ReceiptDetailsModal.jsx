import { useState, useEffect } from "react";
import { X, Check, Trash2, AlertCircle, Copy } from "lucide-react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Input } from "./ui/Input";
import { DatePicker } from "./ui/DatePicker";
import ImageViewerModal from "./ImageViewerModal";
import { storage, databases } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useReceipts } from "../hooks/useReceipts";
import { useTransactions } from "../hooks/useTransactions";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { formatAccountLabel } from "../utils/accountUtils";

export default function ReceiptDetailsModal({ isOpen, onClose, receipt }) {
  const { t } = useTranslation();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { confirmDraft, deleteReceipt } = useReceipts();
  const { createTransaction } = useTransactions();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account: "",
    category: "",
    description: "",
    date: "",
    amount: "",
    installments: "1",
  });
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Fetch linked transaction if exists
  useEffect(() => {
    if (receipt?.transaction) {
      setLoading(true);
      databases
        .getDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
          receipt.transaction
        )
        .then((tx) => {
          setTransaction(tx);
          setFormData({
            account: tx.account || "",
            category: tx.category || "",
            description: tx.description || "",
            date: tx.date ? new Date(tx.date).toISOString().split("T")[0] : "",
            amount: tx.amount ? String(tx.amount) : "",
            installments: tx.installments ? String(tx.installments) : "1",
          });
        })
        .catch((err) => {
          console.error("Error fetching transaction:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setTransaction(null);
      setFormData({
        account: "",
        category: "",
        description: receipt?.detectedMerchant || "",
        date: receipt?.detectedDate
          ? new Date(receipt.detectedDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        amount: receipt?.detectedAmount ? String(receipt.detectedAmount) : "",
        installments: "1",
      });
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const getFilePreviewUrl = (fileId) => {
    try {
      return storage.getFilePreview(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        fileId,
        800,
        800,
        "center",
        90
      );
    } catch (e) {
      return null;
    }
  };

  const handleConfirmDraft = async () => {
    if (!formData.account) {
      toast.error(t("receipts.selectAccount"));
      return;
    }
    if (!formData.category) {
      toast.error(t("receipts.selectCategory"));
      return;
    }
    if (!formData.date) {
      toast.error(t("receipts.selectDate"));
      return;
    }
    if (!formData.amount) {
      toast.error(t("receipts.enterAmount"));
      return;
    }

    try {
      if (transaction) {
        await confirmDraft({
          transactionId: transaction.$id,
          updates: {
            account: formData.account,
            category: formData.category,
            description: formData.description,
            date: new Date(formData.date).toISOString(),
            amount: parseFloat(formData.amount),
            installments: parseInt(formData.installments) || 1,
          },
        });
        toast.success(t("receipts.draftConfirmed"));
      } else {
        // Create new transaction
        const newTx = await createTransaction({
          account: formData.account,
          category: formData.category,
          description: formData.description,
          date: new Date(formData.date).toISOString(),
          amount: parseFloat(formData.amount),
          type: "expense", // Default to expense for receipts
          installments: parseInt(formData.installments) || 1,
        });

        // Link receipt to transaction
        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
          receipt.$id,
          { transaction: newTx.$id }
        );

        toast.success(t("receipts.transactionCreated"));
      }
      onClose();
    } catch (error) {
      console.error("Error confirming/creating transaction:", error);
      toast.error(t("receipts.confirmError"));
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm(t("receipts.deleteDraftConfirm"))) return;

    try {
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        transaction.$id
      );

      // Update receipt to remove transaction link
      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        receipt.$id,
        { transaction: null }
      );

      toast.success(t("receipts.draftDeleted"));
      onClose();
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error(t("receipts.deleteError"));
    }
  };

  const accountOptions = accounts.map((acc) => ({
    value: acc.$id,
    label: formatAccountLabel(acc),
  }));

  const categoryOptions = categories
    .filter((cat) => cat.type === "expense")
    .map((cat) => ({
      value: cat.$id,
      label: cat.name,
    }));

  const selectedAccount = accounts.find((a) => a.$id === formData.account);
  const isCreditCard = selectedAccount?.type === "credit";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {t("receipts.receiptDetails")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Receipt Image and OCR Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="bg-zinc-950 rounded-xl overflow-hidden">
              {receipt.fileId ? (
                <img
                  src={getFilePreviewUrl(receipt.fileId)}
                  alt="Receipt"
                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageViewerOpen(true)}
                  title={t("receipts.clickToEnlarge")}
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-zinc-600">
                  {t("receipts.noImage")}
                </div>
              )}
            </div>

            {/* OCR Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {t("receipts.ocrResults")}
              </h3>

              <div className="space-y-3">
                {/* Status */}
                <div>
                  <p className="text-sm text-zinc-500 mb-1">
                    {t("common.status")}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      receipt.status === "processed"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : receipt.status === "processing"
                        ? "bg-blue-500/10 text-blue-500"
                        : receipt.status === "failed"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {t(`receipts.status.${receipt.status}`)}
                  </span>
                </div>

                {/* Amount */}
                {receipt.detectedAmount != null && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">
                      {t("receipts.detectedAmount")}
                    </p>
                    <p className="text-2xl font-bold text-emerald-500">
                      ${receipt.detectedAmount.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Date */}
                {receipt.detectedDate && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">
                      {t("receipts.detectedDate")}
                    </p>
                    <p className="text-white">
                      {new Date(receipt.detectedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Merchant */}
                {receipt.detectedMerchant && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">
                      {t("receipts.detectedMerchant")}
                    </p>
                    <p className="text-white">{receipt.detectedMerchant}</p>
                  </div>
                )}

                {/* Confidence */}
                {receipt.confidence !== undefined && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">
                      {t("receipts.confidence")}
                    </p>
                    <p className={`text-lg font-semibold ${confidenceColor}`}>
                      {(receipt.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Draft Transaction Form */}
          {((transaction && transaction.isDraft) ||
            (!transaction && receipt.status === "processed")) && (
            <div className="bg-zinc-800/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-yellow-500" />
                <h3 className="text-lg font-semibold text-white">
                  {transaction
                    ? t("receipts.draftTransaction")
                    : t("receipts.createTransaction")}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.account")} *
                  </label>
                  <Select
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({ ...formData, account: e.target.value })
                    }
                    options={[
                      { value: "", label: t("receipts.selectAccount") },
                      ...accountOptions,
                    ]}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.category")} *
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    options={[
                      { value: "", label: t("receipts.selectCategory") },
                      ...categoryOptions,
                    ]}
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.description")}
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("receipts.descriptionPlaceholder")}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.amount")} *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div>
                  <DatePicker
                    label={`${t("receipts.date")} *`}
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                {/* Installments (MSI) - Only for Credit Cards */}
                {isCreditCard && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      {t("transactions.msi")}
                    </label>
                    <Select
                      value={formData.installments}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          installments: e.target.value,
                        })
                      }
                      options={[
                        { value: "1", label: t("transactions.noDefer") },
                        { value: "3", label: "3 Meses" },
                        { value: "6", label: "6 Meses" },
                        { value: "9", label: "9 Meses" },
                        { value: "12", label: "12 Meses" },
                        { value: "18", label: "18 Meses" },
                        { value: "24", label: "24 Meses" },
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleConfirmDraft}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
                  disabled={
                    !formData.account || !formData.category || !formData.amount
                  }
                >
                  <Check size={20} className="mr-2" />
                  {transaction
                    ? t("receipts.confirmTransaction")
                    : t("receipts.createTransaction")}
                </Button>
                {transaction && (
                  <Button
                    onClick={handleDeleteDraft}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
                  >
                    <Trash2 size={20} className="mr-2" />
                    {t("receipts.deleteDraft")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* OCR Text (collapsible) */}
          {receipt.ocrText && (
            <details className="bg-zinc-800/30 rounded-xl group">
              <summary className="p-4 cursor-pointer text-white font-medium hover:bg-zinc-800/50 transition-colors rounded-xl flex justify-between items-center">
                <span>{t("receipts.viewOcrText")}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(receipt.ocrText);
                    toast.success(t("common.copied"));
                  }}
                  className="text-zinc-400 hover:text-white p-1 h-auto"
                >
                  <Copy size={16} />
                </Button>
              </summary>
              <div className="p-4 pt-0">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                  {receipt.ocrText}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        fileId={receipt?.fileId}
        fileName="receipt"
      />
    </div>
  );
}
