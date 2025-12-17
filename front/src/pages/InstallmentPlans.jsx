import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  CreditCard,
  Calendar,
  DollarSign,
  PieChart,
  Trash2,
  CheckCircle,
} from "lucide-react";
import PageLayout from "../components/PageLayout";
import { Button } from "../components/ui/Button";
import { useInstallmentPlans } from "../hooks/useInstallmentPlans";
import { useDateFormatter } from "../hooks/useDateFormatter";
import { formatCurrency } from "../utils/reportUtils";
import { useAccounts } from "../hooks/useAccounts";
import { formatAccountLabel } from "../utils/accountUtils";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { MoneyInput } from "../components/ui/MoneyInput";
import { DatePicker } from "../components/ui/DatePicker";
import toast from "react-hot-toast";

// Simple Modal specific for creating Plan (can be extracted later)
const CreatePlanModal = ({ isOpen, onClose, onCreate, accounts }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    title: "",
    account: "",
    principalAmount: "",
    installmentsTotal: "3",
    installmentsPaid: "0",
    startDate: new Date().toISOString().split("T")[0],
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.account || !formData.principalAmount) {
      toast.error(t("common.error"));
      return;
    }

    onCreate({
      ...formData,
      principalAmount: parseFloat(formData.principalAmount),
      installmentsTotal: parseInt(formData.installmentsTotal),
      installmentsPaid: parseInt(formData.installmentsPaid) || 0,
      // Auto calculate monthly amount (can be refined)
      monthlyAmount:
        parseFloat(formData.principalAmount) /
        parseInt(formData.installmentsTotal),
      currency:
        accounts.find((a) => a.$id === formData.account)?.currency || "MXN",
      // Calculate next due date (simple assumption: 1 month from start)
      nextDueDate: new Date(
        new Date(formData.startDate).setMonth(
          new Date(formData.startDate).getMonth() + 1
        )
      ).toISOString(),
    });
  };

  const creditAccounts = accounts.filter((a) => a.type === "credit");

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          {t("msi.newPlan")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              {t("common.name")}
            </label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g. iPhone 15"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              {t("reports.account")}
            </label>
            <Select
              value={formData.account}
              onChange={(e) =>
                setFormData({ ...formData, account: e.target.value })
              }
              options={[
                { value: "", label: t("receipts.selectAccount") },
                ...creditAccounts.map((a) => ({
                  value: a.$id,
                  label: formatAccountLabel(a),
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              {t("common.amount")}
            </label>
            <MoneyInput
              value={formData.principalAmount}
              onChange={(e) =>
                setFormData({ ...formData, principalAmount: e.target.value })
              }
              currency="MXN"
              locale={i18n.language === "es" ? "es-MX" : "en-US"}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                {t("msi.installments")}
              </label>
              <Select
                value={formData.installmentsTotal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    installmentsTotal: e.target.value,
                  })
                }
                options={[
                  { value: "3", label: "3 Meses" },
                  { value: "6", label: "6 Meses" },
                  { value: "9", label: "9 Meses" },
                  { value: "12", label: "12 Meses" },
                  { value: "18", label: "18 Meses" },
                  { value: "24", label: "24 Meses" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                {t("msi.paidInstallments") || "Pagadas"}
              </label>
              <Input
                type="number"
                min="0"
                max={formData.installmentsTotal}
                value={formData.installmentsPaid}
                onChange={(e) =>
                  setFormData({ ...formData, installmentsPaid: e.target.value })
                }
              />
            </div>
            <div>
              <DatePicker
                label={t("common.date")}
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-zinc-400"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
            >
              {t("common.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function InstallmentPlans() {
  const { t } = useTranslation();
  const { plans, isLoading, createPlan, deletePlan, isCreating } =
    useInstallmentPlans();
  const { accounts } = useAccounts();
  const { formatDate } = useDateFormatter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (data) => {
    try {
      await createPlan(data);
      toast.success(t("common.saved"));
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(t("msi.createError"));
    }
  };

  const remainingTotal = plans.reduce((sum, p) => {
    const amount = parseFloat(p.amount);
    const installments = p.installments || 1;
    const paid = p.installmentsPaid || 0;
    const monthly = amount / installments;
    return sum + (amount - monthly * paid);
  }, 0);
  const monthlyPaymentTotal = plans
    .filter((p) => (p.installmentsPaid || 0) < (p.installments || 1))
    .reduce((sum, p) => sum + parseFloat(p.amount) / (p.installments || 1), 0);

  return (
    <PageLayout
      title={t("msi.title")}
      subtitle={t("msi.subtitle")}
      icon={PieChart}
      action={
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Plus size={20} className="mr-2" />
          {t("msi.addPlan")}
        </Button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
              <CreditCard size={20} />
            </div>
            <span className="text-zinc-400 font-medium">
              {t("msi.totalDebt")}
            </span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(remainingTotal, "MXN")}
          </p>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500/10 rounded-full text-pink-500">
              <Calendar size={20} />
            </div>
            <span className="text-zinc-400 font-medium">
              {t("msi.monthlyPayment")}
            </span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(monthlyPaymentTotal, "MXN")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-zinc-500">
          {t("common.loading")}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
          <PieChart size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-400">{t("msi.noPlans")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan) => {
            // Map Transaction fields to Plan View fields
            const installmentsTotal = plan.installments || 1;
            const installmentsPaid = plan.installmentsPaid || 0;
            const principalAmount = parseFloat(plan.amount);
            const monthlyAmount = principalAmount / installmentsTotal;

            const progress = (installmentsPaid / installmentsTotal) * 100;
            const remaining =
              principalAmount - monthlyAmount * installmentsPaid;

            // Calculate next due date
            const startDate = new Date(plan.date);
            const nextDueDate = new Date(startDate);
            nextDueDate.setMonth(startDate.getMonth() + installmentsPaid + 1);

            return (
              <div
                key={plan.$id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <PieChart size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {plan.description || t("nav.msi")}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {accounts.find((a) => a.$id === plan.account)?.name ||
                          "Unknown Account"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(remaining, plan.currency || "MXN")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("msi.remaining")}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400 mb-4">
                  <span>
                    {t("msi.paid", {
                      count: installmentsPaid,
                      total: installmentsTotal,
                    })}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Calendar size={16} className="text-zinc-500" />
                    <span>
                      {t("msi.nextPayment")}:{" "}
                      {formatDate(nextDueDate.toISOString())}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">
                      {formatCurrency(monthlyAmount, plan.currency || "MXN")}
                      /mes
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        accounts={accounts}
      />
    </PageLayout>
  );
}
