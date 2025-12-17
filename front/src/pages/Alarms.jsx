import { useState } from "react";
import { useAlarms } from "../hooks/useAlarms";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import PageLayout from "../components/PageLayout";
import AnimatedModal from "../components/AnimatedModal";
import DeleteConfirmationModal from "../components/ui/DeleteConfirmationModal";
import { Bell, Plus, Trash2, Calendar, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "../hooks/useDateFormatter";

export default function Alarms() {
  const { alarms, isLoading, createAlarm, deleteAlarm } = useAlarms();
  const { t } = useTranslation();
  const { formatDate } = useDateFormatter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [alarmToDelete, setAlarmToDelete] = useState(null);

  const initialFormState = {
    title: "",
    dueDate: new Date().toISOString().split("T")[0],
    recurrence: "none",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Request notification permission on mount or on action
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Notificaciones no soportadas en este navegador");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Notificaciones activadas");
    } else {
      toast.error("Permiso denegado para notificaciones");
    }
  };

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (alarm) => {
    setAlarmToDelete(alarm);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!alarmToDelete) return;
    try {
      await deleteAlarm(alarmToDelete.$id);
      toast.success(t("alarms.deleteSuccess") || "Alarma eliminada");
      setIsDeleteModalOpen(false);
      setAlarmToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error(t("alarms.deleteError") || "Error al eliminar la alarma");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Set time to noon to avoid timezone issues for simple dates
      const dateObj = new Date(formData.dueDate);
      dateObj.setHours(12, 0, 0, 0);

      await createAlarm({
        ...formData,
        dueDate: dateObj.toISOString(),
      });
      toast.success(t("alarms.createSuccess") || "Alarma creada");
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t("alarms.createError") || "Error al crear la alarma");
    }
  };

  const getRecurrenceLabel = (value) => {
    switch (value) {
      case "none":
        return t("alarms.none") || "Una vez";
      case "daily":
        return t("alarms.daily") || "Diariamente";
      case "weekly":
        return t("alarms.weekly") || "Semanalmente";
      case "monthly":
        return t("alarms.monthly") || "Mensualmente";
      case "annual":
        return t("alarms.annual") || "Anualmente";
      default:
        return value;
    }
  };

  // Logic to determine status (active, due, etc.) could go here
  // For now simple list.

  return (
    <PageLayout
      title={t("alarms.title") || "Alarmas y Notificaciones"}
      subtitle={t("alarms.subtitle") || "Gestiona tus recordatorios"}
      icon={Bell}
      action={
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
        >
          <Plus size={20} className="mr-2" />
          {t("alarms.add") || "Nueva Alarma"}
        </Button>
      }
    >
      <div className="flex justify-end mb-4">
        {"Notification" in window && Notification.permission !== "granted" && (
          <Button
            variant="ghost"
            onClick={requestNotificationPermission}
            className="text-amber-500 hover:text-amber-400 text-sm"
          >
            <Bell size={16} className="mr-2" />
            {t("alarms.enableNotifications") || "Activar Notificaciones"}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500">
            {t("common.loading") || "Cargando..."}
          </div>
        ) : alarms.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            <Bell size={48} className="mx-auto text-zinc-700 mb-4" />
            <p>{t("alarms.noAlarms") || "No hay alarmas configuradas"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alarms.map((alarm) => (
              <div
                key={alarm.$id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white text-lg">
                      {alarm.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteClick(alarm)}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                    <Calendar size={14} />
                    <span>{formatDate(alarm.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Clock size={14} />
                    <span>{getRecurrenceLabel(alarm.recurrence)}</span>
                  </div>
                </div>

                {/* Future: Add status badge if expired */}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("alarms.add") || "Nueva Alarma"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("alarms.form.title") || "Título"}
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            placeholder="Pagar tarjeta, Renta, etc."
          />

          <Input
            label={t("alarms.form.date") || "Fecha"}
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
            required
          />

          <Select
            label={t("alarms.form.recurrence") || "Repetición"}
            value={formData.recurrence}
            onChange={(e) =>
              setFormData({ ...formData, recurrence: e.target.value })
            }
            options={[
              { value: "none", label: t("alarms.none") || "Una vez" },
              { value: "daily", label: t("alarms.daily") || "Diariamente" },
              { value: "weekly", label: t("alarms.weekly") || "Semanalmente" },
              {
                value: "monthly",
                label: t("alarms.monthly") || "Mensualmente",
              },
              { value: "annual", label: t("alarms.annual") || "Anualmente" },
            ]}
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              {t("common.cancel") || "Cancelar"}
            </Button>
            <Button type="submit">{t("common.create") || "Crear"}</Button>
          </div>
        </form>
      </AnimatedModal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("alarms.deleteTitle") || "Eliminar Alarma"}
        description={
          t("alarms.deleteDesc") ||
          "¿Estás seguro de que deseas eliminar esta alarma?"
        }
      />
    </PageLayout>
  );
}
