import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../hooks/useAccounts";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import PageLayout from "../components/PageLayout";
import DeleteConfirmationModal from "../components/ui/DeleteConfirmationModal";
import {
  Plus,
  Wallet,
  CreditCard,
  Banknote,
  X,
  CircleDollarSign,
  PiggyBank,
  Landmark,
  Pencil,
  Trash2,
  TrendingUp,
  Bitcoin,
  Briefcase,
  Building2,
  Gem,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const ICONS = [
  { id: "wallet", component: Wallet },
  { id: "cash", component: Banknote },
  { id: "bank", component: Landmark },
  { id: "card", component: CreditCard },
  { id: "dollar", component: CircleDollarSign },
  { id: "piggy", component: PiggyBank },
  { id: "investment", component: TrendingUp },
  { id: "crypto", component: Bitcoin },
  { id: "business", component: Briefcase },
  { id: "building", component: Building2 },
  { id: "asset", component: Gem },
  { id: "safe", component: Lock },
];

// Tailwind 500 shades
const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#84cc16", // lime
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#64748b", // slate
  "#71717a", // zinc
];

export default function Accounts() {
  const {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    isDeleting,
  } = useAccounts();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  const { t } = useTranslation();

  const initialFormState = {
    name: "",
    type: "cash",
    initialBalance: "",
    currency: "MXN",
    institution: "",
    cardLast4: "",
    billingDay: "",
    dueDay: "",
    creditLimit: "",
    yieldRate: "",
    yieldFrequency: "annual",
    color: "#10b981",
    icon: "wallet",
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account) => {
    setEditingId(account.$id);
    setFormData({
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      currency: account.currency,
      institution: account.institution || "",
      cardLast4: account.cardLast4 || "",
      billingDay: account.billingDay || "",
      dueDay: account.dueDay || "",
      creditLimit: account.creditLimit || "",
      yieldRate: account.yieldRate || "",
      yieldFrequency: account.yieldFrequency || "annual",
      color: account.color || "#10b981",
      icon: account.icon || "wallet",
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (account) => {
    setAccountToDelete(account);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.$id);
      toast.success(t("components.deleteModal.success", { item: "Account" }));
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(t("components.deleteModal.error"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
        institution: formData.institution,
        color: formData.color,
        icon: formData.icon,
      };

      // Only send initialBalance on creation
      if (!editingId) {
        payload.initialBalance = parseFloat(formData.initialBalance) || 0;
      }

      if (formData.type === "credit" || formData.type === "debit") {
        payload.cardLast4 = formData.cardLast4;
      }

      if (formData.type === "credit") {
        payload.billingDay = parseInt(formData.billingDay) || null;
        payload.dueDay = parseInt(formData.dueDay) || null;
        payload.creditLimit = parseFloat(formData.creditLimit) || 0;
      }

      if (formData.type === "investment") {
        payload.yieldRate = parseFloat(formData.yieldRate) || 0;
        payload.yieldFrequency = formData.yieldFrequency;
      }

      if (editingId) {
        await updateAccount({ id: editingId, data: payload });
        toast.success(t("accounts.updateSuccess"));
      } else {
        await createAccount(payload);
        toast.success(t("accounts.createSuccess"));
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving account:", error);
      toast.error(
        editingId ? t("accounts.updateError") : t("accounts.createError")
      );
    }
  };

  const getIcon = (iconName) => {
    const iconDef = ICONS.find((i) => i.id === iconName);
    const IconComponent = iconDef ? iconDef.component : Wallet;
    return <IconComponent size={24} />;
  };

  const accountTypeOptions = [
    { value: "cash", label: t("accounts.types.cash") },
    { value: "debit", label: t("accounts.types.debit") },
    { value: "credit", label: t("accounts.types.credit") },
    { value: "savings", label: t("accounts.types.savings") },
    { value: "investment", label: t("accounts.types.investment") },
    { value: "wallet", label: t("accounts.types.wallet") },
    { value: "other", label: t("accounts.types.other") },
  ];

  const yieldFrequencyOptions = [
    { value: "annual", label: t("accounts.frequencies.annual") },
    { value: "monthly", label: t("accounts.frequencies.monthly") },
    { value: "daily", label: t("accounts.frequencies.daily") },
  ];

  return (
    <PageLayout
      title={t("accounts.title")}
      subtitle={t("accounts.subtitle")}
      icon={Wallet}
      action={
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
        >
          <Plus size={20} className="mr-2" />
          {t("accounts.addAccount")}
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-zinc-400">{t("accounts.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const hexColor = account.color || "#10b981"; // Fallback to emerald hex

            return (
              <div
                key={account.$id}
                onClick={() => navigate(`/accounts/${account.$id}`)}
                className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group relative overflow-hidden cursor-pointer"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: hexColor }}
                />

                <div className="flex items-start justify-between mb-4 pl-3">
                  <div
                    className="p-3 rounded-2xl text-white"
                    style={{
                      backgroundColor: `${hexColor}33`, // 20% opacity approx (hex alpha)
                      color: hexColor,
                    }}
                  >
                    {getIcon(account.icon || account.type)}
                  </div>

                  {/* Actions: Edit and Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDelete(account);
                      }}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"
                      title={t("common.delete")}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(account);
                      }}
                      className="p-2 text-zinc-500 hover:bg-zinc-800 rounded-lg transition-all"
                      style={{
                        hoverColor: hexColor, // Note: This isn't valid React style for hover. We'll stick to classes or just standard hover helpers.
                        // Since we can't easily dynamic hover color without CSS variables, we'll keep standard hover:text-white or similar
                      }}
                      title={t("common.edit")}
                    >
                      <span className="hover:text-white transition-colors">
                        <Pencil size={18} />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pl-3 relative">
                  {/* Account Type Badge */}
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 capitalize">
                      {t(`accounts.types.${account.type}`, account.type)}
                    </span>
                    {account.institution && (
                      <span className="text-xs text-zinc-500 font-medium border border-zinc-800 px-2 py-0.5 rounded-full">
                        {account.institution}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    {account.name}
                    {account.cardLast4 && (
                      <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">
                        •••• {account.cardLast4}
                      </span>
                    )}
                  </h3>
                  <p className="text-2xl font-bold text-white">
                    $
                    {account.currentBalance.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {account.type === "credit" && account.creditLimit && (
                    <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          backgroundColor: hexColor,
                          width: `${Math.min(
                            (Math.abs(account.currentBalance) /
                              account.creditLimit) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              {t("accounts.noAccounts")}
            </div>
          )}
        </div>
      )}

      {/* Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 flex flex-col max-h-[90dvh] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-0 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {editingId
                  ? t("accounts.editAccountTitle")
                  : t("accounts.newAccountTitle")}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    {t("accounts.nameLabel")}
                  </label>
                  <Input
                    required
                    placeholder={t("accounts.namePlaceholder")}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Select
                    label={t("accounts.typeLabel")}
                    options={accountTypeOptions}
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    {t("accounts.institutionLabel")}{" "}
                    <span className="text-zinc-500 text-xs">
                      {t("accounts.optional")}
                    </span>
                  </label>
                  <Input
                    placeholder="BBVA, Santander, etc."
                    value={formData.institution}
                    onChange={(e) =>
                      setFormData({ ...formData, institution: e.target.value })
                    }
                  />
                </div>

                {(formData.type === "credit" || formData.type === "debit") && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      {t("accounts.cardLast4Label")}
                    </label>
                    <Input
                      maxLength={4}
                      placeholder="1234"
                      value={formData.cardLast4}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setFormData({ ...formData, cardLast4: val });
                      }}
                    />
                  </div>
                )}

                {formData.type === "credit" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                          {t("accounts.billingDayLabel")}
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="1"
                          value={formData.billingDay}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingDay: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                          {t("accounts.dueDayLabel")}
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="15"
                          value={formData.dueDay}
                          onChange={(e) =>
                            setFormData({ ...formData, dueDay: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        {t("accounts.creditLimitLabel")}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.creditLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creditLimit: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {formData.type === "investment" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        {t("accounts.yieldRateLabel")}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="10.5"
                        value={formData.yieldRate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val < 0) return; // Prevent negative values
                          setFormData({
                            ...formData,
                            yieldRate: e.target.value,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Select
                        label={t("accounts.yieldFrequencyLabel")}
                        options={yieldFrequencyOptions}
                        value={formData.yieldFrequency}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            yieldFrequency: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      {t("accounts.colorLabel")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, color: hex })
                          }
                          style={{ backgroundColor: hex }}
                          className={`w-6 h-6 rounded-full transition-all ${
                            formData.color === hex
                              ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                              : "hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      {t("accounts.iconLabel")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map(({ id, component: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: id })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            formData.icon === id
                              ? "bg-zinc-700 text-white"
                              : "text-zinc-400 hover:text-white"
                          }`}
                          style={
                            formData.icon === id
                              ? { color: formData.color }
                              : {}
                          }
                        >
                          <Icon size={20} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      {t("accounts.initialBalanceLabel")}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.initialBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initialBalance: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full text-zinc-950 font-bold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: formData.color }}
                  >
                    {editingId
                      ? t("accounts.updateButton")
                      : t("accounts.createButton")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("components.deleteModal.title")}
        description={t("components.deleteModal.description")}
        isDeleting={isDeleting}
      />
    </PageLayout>
  );
}
