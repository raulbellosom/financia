import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "../hooks/useAccounts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function TransactionModal({ isOpen, onClose }) {
  const { createTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    account: "",
    installments: 1,
  });

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">
          {t("components.transactionModal.title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                {t("components.transactionModal.type")}
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="expense">
                  {t("components.transactionModal.expense")}
                </option>
                <option value="income">
                  {t("components.transactionModal.income")}
                </option>
              </select>
            </div>

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

          <Input
            label={t("components.transactionModal.date")}
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />

          <div>
            <label className="text-sm font-medium text-zinc-400 mb-2 block">
              {t("components.transactionModal.account")}
            </label>
            <select
              name="account"
              value={formData.account}
              onChange={handleChange}
              required
              className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">
                {t("components.transactionModal.selectAccount")}
              </option>
              {accounts.map((acc) => (
                <option key={acc.$id} value={acc.$id}>
                  {acc.name} (${acc.currentBalance})
                </option>
              ))}
            </select>
          </div>

          {isCreditCard && formData.type === "expense" && (
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                {t("components.transactionModal.installments") || "Meses (MSI)"}
              </label>
              <select
                name="installments"
                value={formData.installments}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="1">1 (Contado)</option>
                <option value="3">3 Meses</option>
                <option value="6">6 Meses</option>
                <option value="9">9 Meses</option>
                <option value="12">12 Meses</option>
                <option value="18">18 Meses</option>
                <option value="24">24 Meses</option>
              </select>
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={isCreating}>
              {t("components.transactionModal.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
