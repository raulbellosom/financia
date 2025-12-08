import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { databases, storage } from "../lib/appwrite";
import { Button } from "../components/Button";
import PageLayout from "../components/PageLayout";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import ImageViewerModal from "../components/ImageViewerModal";
import { APPWRITE_CONFIG } from "../lib/constants";
import { Receipt, Upload, Loader2, Trash2, FileText, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ID, Query } from "appwrite";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

// Extracted Card Component for better state handling
const ReceiptCard = ({ receipt, onDeleteRequest, onViewRequest }) => {
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();

  // Helper inside component to access environment variables easily
  const getFilePreviewUrl = (fileId) => {
    try {
      // Return thumbnail URL
      return storage.getFilePreview(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        fileId,
        400, // width
        400, // height
        "center", // gravity
        80 // quality
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all relative">
      <div className="aspect-square bg-zinc-950 relative overflow-hidden">
        {/* Fallback Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
          <FileText size={48} />
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

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
          <button
            onClick={() => onViewRequest(receipt)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            title={t("common.view")}
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onDeleteRequest(receipt)}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
            title={t("common.delete")}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              receipt.status === "processed"
                ? "bg-emerald-500/10 text-emerald-500"
                : receipt.status === "processing"
                ? "bg-blue-500/10 text-blue-500"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {t(`status.${receipt.status}`, receipt.status)}
          </span>
          <span className="text-xs text-zinc-500">
            {formatDate(receipt.$createdAt)}
          </span>
        </div>
        {receipt.ocrText && (
          <p className="text-sm text-zinc-300 line-clamp-2 mt-2">
            {receipt.ocrText}
          </p>
        )}
      </div>
    </div>
  );
};

export default function Receipts() {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();

  // Modals State
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [receiptToView, setReceiptToView] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch receipts with polling
  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipts", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        [Query.equal("profile", userInfo.$id), Query.orderDesc("$createdAt")]
      );
      return response.documents;
    },
    enabled: !!userInfo,
    refetchInterval: 5000,
  });

  // Upload mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async (file) => {
      const fileResponse = await storage.createFile(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        ID.unique(),
        file
      );

      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          fileId: fileResponse.$id,
          status: "uploaded",
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["receipts"]);
      toast.success(t("receipts.uploadSuccess"));
    },
    onError: (error) => {
      console.error("Error uploading receipt:", error);
      toast.error(t("receipts.uploadError"));
    },
  });

  // Delete mutation
  const deleteReceiptMutation = useMutation({
    mutationFn: async (receipt) => {
      // 1. Delete file from storage (if exists)
      if (receipt.fileId) {
        try {
          await storage.deleteFile(
            APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
            receipt.fileId
          );
        } catch (e) {
          console.warn("File might already be deleted or not found:", e);
        }
      }

      // 2. Delete document from database
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        receipt.$id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["receipts"]);
      toast.success(t("receipts.deleteSuccess"));
      setReceiptToDelete(null);
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting receipt:", error);
      toast.error(t("receipts.deleteError"));
    },
  });

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        await uploadReceiptMutation.mutateAsync(file);
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    }
  };

  const openDeleteModal = (receipt) => {
    setReceiptToDelete(receipt);
    setIsDeleteModalOpen(true);
  };

  const openViewModal = (receipt) => {
    setReceiptToView(receipt);
    setIsViewModalOpen(true);
  };

  const confirmDelete = () => {
    if (receiptToDelete) {
      deleteReceiptMutation.mutate(receiptToDelete);
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
            {uploading ? (
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
              disabled={uploading}
            />
          </label>
        </div>
      }
    >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.$id}
              receipt={receipt}
              onDeleteRequest={openDeleteModal}
              onViewRequest={openViewModal}
            />
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
        isDeleting={deleteReceiptMutation.isPending}
      />

      {/* View Modal */}
      <ImageViewerModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        fileId={receiptToView?.fileId}
        fileName="receipt"
      />
    </PageLayout>
  );
}
