import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./Button";
import clsx from "clsx";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isDeleting = false,
}) {
  const { t } = useTranslation();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const modalTitle = title || t("components.deleteModal.defaultTitle");
  const modalDesc = description || t("components.deleteModal.defaultDesc");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden relative z-10"
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    {modalTitle}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {modalDesc}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    {t("components.deleteModal.cancel")}
                  </Button>
                  <button
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className={clsx(
                      "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                      "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isDeleting && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {t("components.deleteModal.delete")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
