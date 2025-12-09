import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
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
  Wallet,
  CreditCard,
  Banknote,
  CircleDollarSign,
  PiggyBank,
  Landmark,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  HeartPulse,
  Plane,
  GraduationCap,
  Gift,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Tags,
  Shirt,
  Coffee,
  Globe,
  Smartphone,
  Wifi,
  Music,
  Tv,
  Dumbbell,
  PawPrint,
  Package,
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
  { id: "shopping", component: ShoppingCart },
  { id: "food", component: Utensils },
  { id: "clothing", component: Shirt },
  { id: "coffee", component: Coffee },
  { id: "online", component: Globe },
  { id: "package", component: Package },
  { id: "phone", component: Smartphone },
  { id: "internet", component: Wifi },
  { id: "entertainment", component: Tv },
  { id: "music", component: Music },
  { id: "gym", component: Dumbbell },
  { id: "pets", component: PawPrint },
  { id: "transport", component: Car },
  { id: "home", component: Home },
  { id: "utilities", component: Zap },
  { id: "health", component: HeartPulse },
  { id: "travel", component: Plane },
  { id: "education", component: GraduationCap },
  { id: "gift", component: Gift },
  { id: "work", component: Briefcase },
];

const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#71717a", // zinc
];

export default function Categories() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isDeleting,
  } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const { t } = useTranslation();

  const initialFormState = {
    name: "",
    type: "expense",
    color: "#10b981",
    icon: "shopping",
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingId(category.$id);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color || "#10b981",
      icon: category.icon || "shopping",
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.$id);
      toast.success(t("categories.deleteSuccess"));
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error(t("categories.deleteError"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCategory({ id: editingId, data: formData });
        toast.success(t("categories.updateSuccess"));
      } else {
        await createCategory({ ...formData, isDefault: false, sortOrder: 0 });
        toast.success(t("categories.createSuccess"));
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        editingId ? t("categories.updateError") : t("categories.createError")
      );
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const renderCategoryList = (list, title, icon) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-400 mb-4">
        {icon}
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full">
          {list.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((category) => {
          const IconComponent =
            ICONS.find((i) => i.id === category.icon)?.component ||
            ShoppingCart;
          return (
            <div
              key={category.$id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                  }}
                >
                  <IconComponent size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-white">{category.name}</h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(category)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDeleteClick(category)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            {t("categories.noCategories")}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title={t("categories.title")}
      subtitle={t("categories.subtitle")}
      icon={Tags}
      action={
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
        >
          <Plus size={20} className="mr-2" />
          {t("categories.add")}
        </Button>
      }
    >
      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : (
          <>
            {renderCategoryList(
              incomeCategories,
              t("categories.income"),
              <TrendingUp size={18} />
            )}
            {renderCategoryList(
              expenseCategories,
              t("categories.expense"),
              <TrendingDown size={18} />
            )}
          </>
        )}
      </div>

      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t("categories.edit") : t("categories.add")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("categories.name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder={t("categories.namePlaceholder")}
          />

          <Select
            label={t("categories.type")}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: "income", label: t("categories.income") },
              { value: "expense", label: t("categories.expense") },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              {t("categories.color")}
            </label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formData.color === color
                      ? "ring-2 ring-white scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              {t("categories.icon")}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map(({ id, component: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: id })}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    formData.icon === id
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
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
        onConfirm={handleConfirmDelete}
        title={t("categories.deleteTitle")}
        description={t("categories.deleteDescription", {
          name: categoryToDelete?.name,
        })}
        isLoading={isDeleting}
      />
    </PageLayout>
  );
}
