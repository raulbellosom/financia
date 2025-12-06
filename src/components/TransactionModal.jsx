import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "../hooks/useAccounts";
import toast from "react-hot-toast";

export default function TransactionModal({ isOpen, onClose }) {
  const { createTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    account: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
      });
      toast.success("Transaction created successfully");
      // Reset form
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        account: "",
      });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create transaction");
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

        <h2 className="text-xl font-bold text-white mb-6">New Transaction</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <Input
              label="Amount"
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
            label="Description"
            placeholder="What is this for?"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />

          <Input
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />

          <div>
            <label className="text-sm font-medium text-zinc-400 mb-2 block">
              Account
            </label>
            <select
              name="account"
              value={formData.account}
              onChange={handleChange}
              required
              className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select an account</option>
              {accounts.map((acc) => (
                <option key={acc.$id} value={acc.$id}>
                  {acc.name} (${acc.currentBalance})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={isCreating}>
              Create Transaction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
