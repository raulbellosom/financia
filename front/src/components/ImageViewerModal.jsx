import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  Maximize2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { storage } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import clsx from "clsx";

export default function ImageViewerModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTweaking, setIsTweaking] = useState(false);

  // Determine URLs
  useEffect(() => {
    if (fileId && isOpen) {
      try {
        const viewUrl = storage.getFileView(
          APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
          fileId
        );
        setImageUrl(viewUrl);
        setLoading(true);
      } catch (e) {
        console.error("Error generating view URL", e);
      }
    } else {
      // Reset state on close
      setScale(1);
      setRotation(0);
      setImageUrl(null);
      setIsTweaking(false);
    }
  }, [fileId, isOpen]);

  const handleDownload = (e) => {
    e.stopPropagation();
    try {
      const downloadUrl = storage.getFileDownload(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        fileId
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName || "receipt.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error downloading file", e);
    }
  };

  const resetView = () => {
    setScale(1);
    setRotation(0);
    setIsTweaking(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
          {/* Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />

          {/* Controls Container */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-50">
            {/* Header / Close */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="flex justify-end pointer-events-auto"
            >
              <button
                onClick={onClose}
                className="group p-3 bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 border border-white/10 rounded-full text-white transition-all duration-300 backdrop-blur-md shadow-lg"
              >
                <X size={24} />
              </button>
            </motion.div>

            {/* Bottom Toolbar */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="flex justify-center pointer-events-auto pb-4"
            >
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full p-2 shadow-2xl shadow-black/50">
                <ToolButton
                  icon={ZoomOut}
                  onClick={() => {
                    setScale((s) => Math.max(0.1, s - 0.2));
                    setIsTweaking(true);
                  }}
                  label="Zoom Out"
                />

                <div className="px-3 min-w-[60px] text-center font-mono text-sm font-medium text-white/90 select-none">
                  {Math.round(scale * 100)}%
                </div>

                <ToolButton
                  icon={ZoomIn}
                  onClick={() => {
                    setScale((s) => Math.min(5, s + 0.2));
                    setIsTweaking(true);
                  }}
                  label="Zoom In"
                />

                <div className="w-px h-6 bg-white/10 mx-2" />

                <ToolButton
                  icon={RotateCw}
                  onClick={() => {
                    setRotation((r) => r + 90);
                    setIsTweaking(true);
                  }}
                  label="Rotate"
                />

                <ToolButton
                  icon={Maximize2}
                  onClick={resetView}
                  label="Reset"
                  active={isTweaking}
                  className={clsx(
                    isTweaking ? "text-emerald-400" : "text-zinc-400"
                  )}
                />

                <div className="w-px h-6 bg-white/10 mx-2" />

                <ToolButton
                  icon={Download}
                  onClick={handleDownload}
                  label="Download"
                  className="bg-white/10 hover:bg-white/20 text-white"
                />
              </div>
            </motion.div>
          </div>

          {/* Image Layer */}
          <motion.div
            className="relative z-10 w-full h-full flex items-center justify-center p-8 pointer-events-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50">
                <Loader2 size={48} className="animate-spin" />
              </div>
            )}

            {imageUrl && (
              <motion.img
                src={imageUrl}
                alt={fileName}
                onLoad={() => setLoading(false)}
                animate={{ scale, rotate: rotation }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                drag
                dragConstraints={{
                  left: -500,
                  right: 500,
                  top: -500,
                  bottom: 500,
                }}
                className={clsx(
                  "max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing shadow-2xl shadow-black/50 rounded-lg",
                  loading ? "opacity-0" : "opacity-100"
                )}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ToolButton({ icon: Icon, onClick, label, className }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "p-3 rounded-full transition-all duration-200 group relative",
        className || "text-zinc-300 hover:text-white hover:bg-white/10"
      )}
      title={label}
    >
      <Icon
        size={20}
        className="transition-transform group-hover:scale-110 active:scale-90"
      />
    </button>
  );
}
