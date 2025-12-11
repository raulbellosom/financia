import { useState } from "react";
import { useRecurringRules } from "../hooks/useRecurringRules";
import { useCategories } from "../hooks/useCategories";
import { useAccounts } from "../hooks/useAccounts";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import PageLayout from "../components/PageLayout";
import AnimatedModal from "../components/AnimatedModal";
import DeleteConfirmationModal from "../components/ui/DeleteConfirmationModal";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Repeat,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

export default function RecurringRules() {
  const { rules, isLoading, createRule, updateRule, deleteRule, isDeleting } =
    useRecurringRules();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { t, i18n } = useTranslation();
  const { formatDate } = useDateFormatter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const initialFormState = {
    name: "",
    amount: "",
    type: "expense",
    frequency: "monthly",
    interval: 1,
    category: "",
    account: "",
    nextRun: new Date().toISOString().split("T")[0],
    autoConfirm: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingId(rule.$id);
    setFormData({
      name: rule.name,
      amount: rule.amount,
      type: rule.type,
      frequency: rule.frequency,
      interval: rule.interval || 1,
      category: rule.category?.$id || rule.category || "",
      account: rule.account?.$id || rule.account || "",
      nextRun: rule.nextRun ? rule.nextRun.split("T")[0] : "",
      autoConfirm: rule.autoConfirm ?? true,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (rule) => {
    setRuleToDelete(rule);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        interval: parseInt(formData.interval),
        // Ensure we send IDs for relations
        category: formData.category,
        account: formData.account,
        // Ensure dates are ISO
        nextRun: new Date(formData.nextRun).toISOString(),
        // If creating, set startDate to nextRun (or today)
        startDate: editingId
          ? undefined // Don't update startDate on edit usually, or keep existing
          : new Date(formData.nextRun).toISOString(),
      };

      if (editingId) {
        // For update, we might not want to send startDate if it's not in the form,
        // but if it's required by Appwrite and we are sending a partial update, it's fine.
        // However, if we are sending the whole object, we need to be careful.
        // The hook handles partial updates.
        await updateRule({ id: editingId, data: payload });
        toast.success(t("recurring.updateSuccess"));
      } else {
        await createRule(payload);
        toast.success(t("recurring.createSuccess"));
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error(
        editingId ? t("recurring.updateError") : t("recurring.createError")
      );
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteRule(ruleToDelete.$id);
      toast.success(t("recurring.deleteSuccess"));
      setIsDeleteModalOpen(false);
      setRuleToDelete(null);
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error(t("recurring.deleteError"));
    }
  };

  const frequencyOptions = [
    { value: "daily", label: t("recurring.frequencies.daily") },
    { value: "weekly", label: t("recurring.frequencies.weekly") },
    { value: "monthly", label: t("recurring.frequencies.monthly") },
    { value: "yearly", label: t("recurring.frequencies.yearly") },
  ];

  const typeOptions = [
    { value: "income", label: t("common.income") },
    { value: "expense", label: t("common.expense") },
  ];

  return (
    <PageLayout
      title={t("recurring.title")}
      subtitle={t("recurring.subtitle")}
      icon={CalendarClock}
      action={
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
        >
          <Plus size={20} className="mr-2" />
          {t("recurring.addRule")}
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-zinc-400">{t("common.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.$id}
              className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-400">
                  <Repeat size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDelete(rule)}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{rule.name}</h3>
              <p className="text-2xl font-bold text-emerald-500 mb-4">
                ${rule.amount.toLocaleString()}
              </p>

              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>{t("recurring.frequency")}:</span>
                  <span className="text-white capitalize">
                    {t(`recurring.frequencies.${rule.frequency}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("recurring.nextRun")}:</span>
                  <span className="text-white">{formatDate(rule.nextRun)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t("recurring.editRule") : t("recurring.createRule")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("common.name")}
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("common.amount")}
              type="number"
              name="amount"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
            <Select
              label={t("common.type")}
              options={typeOptions}
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("recurring.frequency")}
              options={frequencyOptions}
              value={formData.frequency}
              onChange={(e) =>
                setFormData({ ...formData, frequency: e.target.value })
              }
            />
            <Input
              label={t("recurring.interval")}
              type="number"
              min="1"
              name="interval"
              value={formData.interval}
              onChange={(e) =>
                setFormData({ ...formData, interval: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("recurring.nextRun")}
              type="date"
              name="nextRun"
              value={formData.nextRun}
              onChange={(e) =>
                setFormData({ ...formData, nextRun: e.target.value })
              }
              required
              lang={i18n.language}
            />
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.autoConfirm}
                  onChange={(e) =>
                    setFormData({ ...formData, autoConfirm: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-300">
                  {t("recurring.autoConfirm")}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("nav.categories")}
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              options={[
                { value: "", label: t("common.select") },
                ...categories
                  .filter((c) => c.type === formData.type)
                  .map((cat) => ({ value: cat.$id, label: cat.name })),
              ]}
            />

            <Select
              label={t("nav.accounts")}
              value={formData.account}
              onChange={(e) =>
                setFormData({ ...formData, account: e.target.value })
              }
              options={[
                { value: "", label: t("common.select") },
                ...accounts.map((acc) => ({
                  value: acc.$id,
                  label: acc.name,
                })),
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {editingId ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </form>
      </AnimatedModal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t("recurring.deleteTitle")}
        message={t("recurring.deleteMessage", {
          name: ruleToDelete?.name,
        })}
        isLoading={isDeleting}
      />
    </PageLayout>
  );
}
