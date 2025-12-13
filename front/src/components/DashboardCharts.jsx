import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTransactionReports } from "../hooks/useTransactionReports";
import { useCategories } from "../hooks/useCategories";
import {
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  isSameDay,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
} from "lucide-react";

const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

export default function DashboardCharts() {
  const { t } = useTranslation();
  const [rangeType, setRangeType] = useState("month"); // month, week, year
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  useEffect(() => {
    const now = new Date();
    if (rangeType === "month") {
      setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
    } else if (rangeType === "week") {
      setDateRange({ start: subDays(now, 7), end: now });
    } else if (rangeType === "year") {
      setDateRange({ start: startOfYear(now), end: endOfYear(now) });
    }
  }, [rangeType]);

  const { transactions, isLoading: isTransactionsLoading } =
    useTransactionReports({
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

  const { categories, isLoading: isCategoriesLoading } = useCategories();

  const isLoading = isTransactionsLoading || isCategoriesLoading;

  // Process data for Area Chart (Income vs Expenses over time)
  const trendData = useMemo(() => {
    if (!transactions.length) return [];

    // If range is year, group by month
    if (rangeType === "year") {
      const months = [];
      let current = new Date(dateRange.start);
      while (current <= dateRange.end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }

      return months.map((monthDate) => {
        const monthTransactions = transactions.filter((t) => {
          const tDate = new Date(t.date);
          return (
            tDate.getMonth() === monthDate.getMonth() &&
            tDate.getFullYear() === monthDate.getFullYear()
          );
        });

        const income = monthTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          date: format(monthDate, "MMM", { locale: es }),
          income,
          expense,
          fullDate: monthDate,
        };
      });
    }

    // Default: group by day
    const days = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });

    return days.map((day) => {
      const dayTransactions = transactions.filter((t) =>
        isSameDay(new Date(t.date), day)
      );

      const income = dayTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = dayTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        date: format(day, "d MMM", { locale: es }),
        income,
        expense,
        fullDate: day,
      };
    });
  }, [transactions, dateRange, rangeType]);

  // Process data for Pie Chart (Expenses by Category)
  const categoryData = useMemo(() => {
    if (!transactions.length || !categories.length) return [];

    const expenses = transactions.filter((t) => t.type === "expense");
    const categoryMap = new Map();

    expenses.forEach((t) => {
      const categoryId = t.category?.$id || t.category; // Handle populated or ID
      const amount = t.amount;

      if (categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, categoryMap.get(categoryId) + amount);
      } else {
        categoryMap.set(categoryId, amount);
      }
    });

    const data = Array.from(categoryMap.entries())
      .map(([id, value]) => {
        const category = categories.find((c) => c.$id === id);
        return {
          name: category ? category.name : t("common.uncategorized"),
          value,
          color: category?.color || "#71717a", // Default zinc-500
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by amount desc

    return data;
  }, [transactions, categories, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-zinc-400 text-xs mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-zinc-300 capitalize">
                {entry.name === "income"
                  ? t("common.income")
                  : t("common.expense")}
                :
              </span>
              <span className="font-medium text-white">
                ${entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Trend Chart */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl lg:col-span-2 xl:col-span-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {t("dashboard.monthlyTrend")}
            </h3>
          </div>

          <div className="flex bg-zinc-800/50 rounded-lg p-1">
            <button
              onClick={() => setRangeType("week")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rangeType === "week"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setRangeType("month")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rangeType === "month"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setRangeType("year")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rangeType === "year"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              1Y
            </button>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="income"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpense)"
                name="expense"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Chart */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl lg:col-span-2 xl:col-span-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
              <PieChartIcon size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {t("dashboard.expensesByCategory")}
            </h3>
          </div>
        </div>
        <div className="h-[300px] w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                      stroke="rgba(0,0,0,0)"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: data.color || payload[0].fill,
                              }}
                            />
                            <span className="text-zinc-300 font-medium">
                              {data.name}
                            </span>
                          </div>
                          <p className="text-white font-bold pl-4">
                            ${data.value.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
                  formatter={(value, entry) => (
                    <span className="text-zinc-400 ml-2">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-zinc-500 text-sm flex items-center justify-center h-full">
              {t("dashboard.noExpenses")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
