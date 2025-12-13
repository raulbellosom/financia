import { useState } from "react";
import { Button } from "../components/ui/Button";
import PageLayout from "../components/PageLayout";
import DeleteConfirmationModal from "../components/ui/DeleteConfirmationModal";
import ReceiptDetailsModal from "../components/ReceiptDetailsModal";
import { storage } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import {
  Receipt,
  Upload,
  Loader2,
  Trash2,
  FileText,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle,
  Filter,
  Grid,
  List,
  LayoutGrid,
  MoreVertical,
  Edit2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMemo } from "react";
import { useReceipts } from "../hooks/useReceipts";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

// Extracted Card Component for better state handling
const ReceiptCard = ({
  receipt,
  onDeleteRequest,
  onViewRequest,
  onEditRequest,
}) => {
  const [imageError, setImageError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();

  // Helper inside component to access environment variables easily
  const getFilePreviewUrl = (fileId) => {
    try {
      // Return thumbnail URL
      return storage.getFilePreview(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        fileId,
        300, // width (smaller)
        300, // height (smaller)
        "center", // gravity
        60 // quality (lower for thumbnails)
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-all relative cursor-pointer flex flex-col"
      onClick={() => onViewRequest(receipt)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="aspect-4/3 bg-zinc-950 relative overflow-hidden rounded-t-xl">
        {/* Fallback Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-zinc-800">
          <FileText size={32} />
        </div>

        {/* Image */}
        {receipt.fileId && !imageError && (
          <img
            src={getFilePreviewUrl(receipt.fileId)}
            alt="Receipt"
            className="absolute inset-0 w-full h-full object-cover z-10 bg-zinc-950 transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}

        {/* Status Badge (Overlay) */}
        <div className="absolute top-2 right-2 z-20">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border ${
              receipt.status === "processed"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
                : receipt.status === "processing"
                ? "bg-blue-500/20 border-blue-500/30 text-blue-500"
                : receipt.status === "failed"
                ? "bg-red-500/20 border-red-500/30 text-red-500"
                : "bg-zinc-500/20 border-zinc-500/30 text-zinc-400"
            }`}
          >
            {t(`status.${receipt.status}`, receipt.status)}
          </span>
        </div>
      </div>

      {/* Actions Menu - Positioned relative to card, not image, to allow overflow */}
      <div className="absolute top-2 left-2 z-30 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onViewRequest(receipt);
                }}
                className="px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-2"
              >
                <Eye size={14} />
                {t("common.view")}
              </button>

              {/* Only show Edit if processed */}
              {receipt.status === "processed" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEditRequest(receipt);
                  }}
                  className="px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  {t("common.edit")}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDeleteRequest(receipt);
                }}
                className="px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
              >
                <Trash2 size={14} />
                {t("common.delete")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1 rounded-b-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {formatDate(receipt.detectedDate || receipt.$createdAt)}
          </span>
          {receipt.detectedAmount && (
            <span className="text-sm font-bold text-white">
              ${receipt.detectedAmount.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Receipts() {
  const { t } = useTranslation();
  const {
    receipts,
    isLoading,
    uploadReceipt,
    isUploading,
    deleteReceipt,
    isDeleting,
  } = useReceipts();

  // UI State
  const [groupBy, setGroupBy] = useState("day"); // 'day', 'month', 'all'
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'processed', 'processing', 'failed'
  const [filterDate, setFilterDate] = useState("");

  // Modals State
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [receiptToView, setReceiptToView] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [initialEditMode, setInitialEditMode] = useState(false);

  // Grouping Logic
  const groupedReceipts = useMemo(() => {
    if (!receipts) return {};

    // 1. Filter
    const filtered = receipts.filter((r) => {
      const statusMatch = filterStatus === "all" || r.status === filterStatus;
      const dateMatch =
        !filterDate ||
        (r.detectedDate && r.detectedDate.startsWith(filterDate)) ||
        (!r.detectedDate && r.$createdAt.startsWith(filterDate));
      return statusMatch && dateMatch;
    });

    // 2. Group
    if (groupBy === "all") {
      return { [t("common.all")]: filtered };
    }

    return filtered.reduce((groups, receipt) => {
      const date = new Date(receipt.detectedDate || receipt.$createdAt);
      let key = "";

      if (groupBy === "day") {
        key = date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } else if (groupBy === "month") {
        key = date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(receipt);
      return groups;
    }, {});
  }, [receipts, groupBy, filterStatus, t]);

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        await uploadReceipt(file);
        toast.success(t("receipts.uploadSuccess"));
      } catch (error) {
        console.error("Error uploading:", error);
        toast.error(t("receipts.uploadError"));
      } finally {
        e.target.value = "";
      }
    }
  };

  const openDeleteModal = (receipt) => {
    setReceiptToDelete(receipt);
    setIsDeleteModalOpen(true);
  };

  const openDetailsModal = (receipt) => {
    setReceiptToView(receipt);
    setIsDetailsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (receiptToDelete) {
      try {
        await deleteReceipt(receiptToDelete);
        toast.success(t("receipts.deleteSuccess"));
        setReceiptToDelete(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error("Error deleting:", error);
        toast.error(t("receipts.deleteError"));
      }
    }
  };

  return (
    <PageLayout
      title={t("receipts.title")}
      subtitle={t("receipts.subtitle")}
      icon={Receipt}
      action={
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium px-4 py-2 rounded-xl cursor-pointer transition-colors">
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Upload size={20} />
            )}
            <span>{t("receipts.upload")}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
        {/* Group By */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 flex items-center gap-1">
            <Grid size={16} />
            {t("common.groupBy")}:
          </span>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {["day", "month", "all"].map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  groupBy === g
                    ? "bg-zinc-800 text-white font-medium shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t(`common.${g}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400 flex items-center gap-1">
              <Calendar size={16} />
              {t("common.date")}:
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5 [color-scheme:dark]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400 flex items-center gap-1">
              <Filter size={16} />
              {t("common.filter")}:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5"
            >
              <option value="all">{t("common.all")}</option>
              <option value="processed">
                {t("receipts.status.processed")}
              </option>
              <option value="processing">
                {t("receipts.status.processing")}
              </option>
              <option value="failed">{t("receipts.status.failed")}</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">
          {t("common.loading")}
        </div>
      ) : receipts?.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Receipt size={32} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {t("receipts.noReceipts")}
          </h3>
          <p className="text-zinc-400 max-w-md mx-auto mb-6">
            {t("receipts.noReceiptsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedReceipts).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-lg font-medium text-zinc-400 mb-4 sticky top-0 bg-zinc-950/80 backdrop-blur-sm py-2 z-10">
                {group}
                <span className="ml-2 text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map((receipt) => (
                  <ReceiptCard
                    key={receipt.$id}
                    receipt={receipt}
                    onDeleteRequest={(r) => {
                      setReceiptToDelete(r);
                      setIsDeleteModalOpen(true);
                    }}
                    onViewRequest={(r) => {
                      setReceiptToView(r);
                      setInitialEditMode(false);
                      setIsDetailsModalOpen(true);
                    }}
                    onEditRequest={(r) => {
                      setReceiptToView(r);
                      setInitialEditMode(true);
                      setIsDetailsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("receipts.deleteTitle")}
        description={t("receipts.deleteDesc")}
        isDeleting={isDeleting}
      />

      {/* Receipt Details Modal */}
      <ReceiptDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        initialEditMode={initialEditMode}
        receipt={receiptToView}
      />
    </PageLayout>
  );
}
