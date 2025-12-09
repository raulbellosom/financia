import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";
import {
  getQuickPeriods,
  getPreviousPeriod,
  getNextPeriod,
  formatPeriodLabel,
} from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

export default function PeriodSelector({ startDate, endDate, onPeriodChange }) {
  const { t, i18n } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);

  const quickPeriods = getQuickPeriods();

  const handleQuickPeriod = (periodKey) => {
    const period = quickPeriods[periodKey];
    onPeriodChange(period.startDate, period.endDate);
    setShowCustom(false);
  };

  const handlePrevious = () => {
    const prev = getPreviousPeriod(startDate, endDate);
    onPeriodChange(prev.startDate, prev.endDate);
  };

  const handleNext = () => {
    const next = getNextPeriod(startDate, endDate);
    onPeriodChange(next.startDate, next.endDate);
  };

  const handleCustomDateChange = (type, value) => {
    if (type === "start") {
      const newStart = new Date(value);
      newStart.setHours(0, 0, 0, 0);
      onPeriodChange(newStart, endDate);
    } else {
      const newEnd = new Date(value);
      newEnd.setHours(23, 59, 59, 999);
      onPeriodChange(startDate, newEnd);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      {/* Quick Period Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          onClick={() => handleQuickPeriod("today")}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
        >
          {t("reports.today")}
        </Button>
        <Button
          onClick={() => handleQuickPeriod("thisWeek")}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
        >
          {t("reports.thisWeek")}
        </Button>
        <Button
          onClick={() => handleQuickPeriod("thisMonth")}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
        >
          {t("reports.thisMonth")}
        </Button>
        <Button
          onClick={() => handleQuickPeriod("thisYear")}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
        >
          {t("reports.thisYear")}
        </Button>
        <Button
          onClick={() => setShowCustom(!showCustom)}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
        >
          <Calendar size={16} className="mr-2" />
          {t("reports.custom")}
        </Button>
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-zinc-800/50 rounded-xl">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              {t("reports.startDate")}
            </label>
            <input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              {t("reports.endDate")}
            </label>
            <input
              type="date"
              value={endDate.toISOString().split("T")[0]}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Period Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePrevious}
          className="bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          <ChevronLeft size={20} />
        </Button>

        <div className="text-center">
          <p className="text-white font-medium">
            {formatPeriodLabel(startDate, endDate, i18n.language)}
          </p>
        </div>

        <Button
          onClick={handleNext}
          className="bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          <ChevronRight size={20} />
        </Button>
      </div>
    </div>
  );
}
