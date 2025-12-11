import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { clsx } from "clsx";

export default function AnimatedModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={clsx(
                "bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md relative pointer-events-auto shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] overflow-hidden",
                className
              )}
            >
              <div className="flex items-center justify-between p-6 pb-0 shrink-0">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
