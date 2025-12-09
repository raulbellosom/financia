import { useState, useEffect } from "react";
import { X, Check, Trash2, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Input } from "./ui/Input";
import ImageViewerModal from "./ImageViewerModal";
import { storage, databases } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useReceipts } from "../hooks/useReceipts";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export default function ReceiptDetailsModal({ isOpen, onClose, receipt }) {
  const { t } = useTranslation();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { confirmDraft, deleteReceipt } = useReceipts();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account: "",
    category: "",
    description: "",
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

    try {
      await confirmDraft({
        transactionId: transaction.$id,
        updates: {
          account: formData.account,
          category: formData.category,
          description: formData.description,
        },
      });
      toast.success(t("receipts.draftConfirmed"));
      onClose();
    } catch (error) {
      console.error("Error confirming draft:", error);
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
    label: acc.name,
  }));

  const categoryOptions = categories
    .filter((cat) => cat.type === "expense")
    .map((cat) => ({
      value: cat.$id,
      label: cat.name,
    }));

  const confidenceColor =
    receipt.confidence >= 0.7
      ? "text-emerald-500"
      : receipt.confidence >= 0.4
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {transaction && transaction.isDraft && (
            <div className="bg-zinc-800/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-yellow-500" />
                <h3 className="text-lg font-semibold text-white">
                  {t("receipts.draftTransaction")}
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

                {/* Amount (readonly) */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.amount")}
                  </label>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white">
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>

                {/* Date (readonly) */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    {t("receipts.date")}
                  </label>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleConfirmDraft}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
                  disabled={!formData.account || !formData.category}
                >
                  <Check size={20} className="mr-2" />
                  {t("receipts.confirmTransaction")}
                </Button>
                <Button
                  onClick={handleDeleteDraft}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
                >
                  <Trash2 size={20} className="mr-2" />
                  {t("receipts.deleteDraft")}
                </Button>
              </div>
            </div>
          )}

          {/* No Draft Transaction */}
          {!transaction && receipt.status === "processed" && (
            <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
              <p className="text-zinc-400 mb-4">
                {t("receipts.noDraftTransaction")}
              </p>
              <p className="text-sm text-zinc-500">
                {t("receipts.noDraftTransactionDesc")}
              </p>
            </div>
          )}

          {/* OCR Text (collapsible) */}
          {receipt.ocrText && (
            <details className="bg-zinc-800/30 rounded-xl">
              <summary className="p-4 cursor-pointer text-white font-medium hover:bg-zinc-800/50 transition-colors rounded-xl">
                {t("receipts.viewOcrText")}
              </summary>
              <div className="p-4 pt-0">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
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
