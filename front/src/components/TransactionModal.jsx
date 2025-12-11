import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { DatePicker } from "./ui/DatePicker";
import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function TransactionModal({ isOpen, onClose, initialDate }) {
  const { createTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { t } = useTranslation();

  const getInitialDate = () => {
    if (initialDate) {
      const date = new Date(initialDate);
      return date.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: getInitialDate(),
    account: "",
    category: "",
    installments: 1,
  });

  // Update date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      const date = new Date(initialDate);
      setFormData((prev) => ({
        ...prev,
        date: date.toISOString().split("T")[0],
      }));
    }
  }, [initialDate]);

  const selectedAccount = accounts.find((a) => a.$id === formData.account);
  const isCreditCard = selectedAccount?.type === "credit";

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        installments: parseInt(formData.installments) || 1,
      });
      toast.success(t("components.transactionModal.success"));
      // Reset form
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        account: "",
        category: "",
        installments: 1,
      });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("components.transactionModal.error"));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const typeOptions = [
    { value: "expense", label: t("components.transactionModal.expense") },
    { value: "income", label: t("components.transactionModal.income") },
  ];

  const accountOptions = accounts.map((acc) => ({
    value: acc.$id,
    label: `${acc.name} ($${acc.currentBalance})`,
  }));

  const categoryOptions = categories.map((cat) => ({
    value: cat.$id,
    label: cat.name,
  }));

  const installmentOptions = [
    { value: "1", label: "1 (Contado)" },
    { value: "3", label: "3 Meses" },
    { value: "6", label: "6 Meses" },
    { value: "9", label: "9 Meses" },
    { value: "12", label: "12 Meses" },
    { value: "18", label: "18 Meses" },
    { value: "24", label: "24 Meses" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md relative flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <h2 className="text-xl font-bold text-white">
            {t("components.transactionModal.title")}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t("components.transactionModal.type")}
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                options={typeOptions}
              />

              <Input
                label={t("components.transactionModal.amount")}
                type="number"
                step="0.01"
                placeholder="0.00"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.01"
              />
            </div>

            <Input
              label={t("components.transactionModal.description")}
              placeholder={t("components.transactionModal.descPlaceholder")}
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />

            <Select
              label={t("components.transactionModal.category") || "Categoría"}
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              options={categoryOptions}
              placeholder={
                t("components.transactionModal.selectCategory") ||
                "Seleccionar categoría"
              }
            />

            <DatePicker
              label={t("components.transactionModal.date")}
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />

            <Select
              label={t("components.transactionModal.account")}
              value={formData.account}
              onChange={(e) =>
                setFormData({ ...formData, account: e.target.value })
              }
              options={accountOptions}
              placeholder={t("components.transactionModal.selectAccount")}
            />

            {isCreditCard && formData.type === "expense" && (
              <Select
                label={
                  t("components.transactionModal.installments") || "Meses (MSI)"
                }
                value={formData.installments.toString()}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    installments: parseInt(e.target.value),
                  })
                }
                options={installmentOptions}
              />
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full" isLoading={isCreating}>
                {t("components.transactionModal.create")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
