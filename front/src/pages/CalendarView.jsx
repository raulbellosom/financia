import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Calendar, Plus, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/PageLayout";
import { Button } from "../components/ui/Button";
import TransactionModal from "../components/TransactionModal";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import TransactionFilters from "../components/TransactionFilters";
import SummaryCards from "../components/SummaryCards";
import { useTransactionReports } from "../hooks/useTransactionReports";
import { useRecurringRules } from "../hooks/useRecurringRules";
import {
  transactionsToEvents,
  getEventStyle,
  getDefaultView,
  getCalendarMessages,
  getVisibleDateRange,
} from "../utils/calendarUtils";
import {
  generateRecurringEvents,
  generateMSIEvents,
} from "../utils/recurringUtils";
import "../calendar.css";

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "es" ? es : enUS;

  // Setup localizer for react-big-calendar
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: currentLocale }),
    getDay,
    locales: {
      es: es,
      "en-US": enUS,
    },
  });

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(getDefaultView());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [accountId, setAccountId] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [type, setType] = useState(null);
  const [includeDrafts, setIncludeDrafts] = useState(false);

  // Calculate date range based on current view
  const { startDate, endDate } = useMemo(
    () => getVisibleDateRange(currentDate, currentView),
    [currentDate, currentView]
  );

  // Fetch transactions for the visible date range
  const { transactions, totals, isLoading } = useTransactionReports({
    startDate,
    endDate,
    accountId,
    categoryId,
    type,
    includeDrafts,
  });

  const { rules } = useRecurringRules();

  // Convert transactions to calendar events
  const events = useMemo(() => {
    const txEvents = transactionsToEvents(transactions);
    const recurringEvents = transactionsToEvents(
      generateRecurringEvents(rules, startDate, endDate)
    ).map((event) => ({
      ...event,
      title:
        event.title === "recurring.payment"
          ? t("transactions.recurringPayment")
          : event.title,
    }));
    const msiEvents = transactionsToEvents(
      generateMSIEvents(transactions, startDate, endDate)
    );
    return [...txEvents, ...recurringEvents, ...msiEvents];
  }, [transactions, rules, startDate, endDate, t]);

  // Handle view change and update default view for screen size
  useEffect(() => {
    const handleResize = () => {
      const newDefaultView = getDefaultView();
      if (window.innerWidth < 768 && currentView === "month") {
        setCurrentView(newDefaultView);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentView]);

  // Event handlers
  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedTransaction(event.resource);
    setDetailsModalOpen(true);
  }, []);

  const handleNavigate = useCallback((newDate) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView) => {
    setCurrentView(newView);
  }, []);

  const handleFilterChange = (filterName, value) => {
    switch (filterName) {
      case "accountId":
        setAccountId(value);
        break;
      case "categoryId":
        setCategoryId(value);
        break;
      case "type":
        setType(value);
        break;
      case "includeDrafts":
        setIncludeDrafts(value);
        break;
    }
  };

  const handleClearFilters = () => {
    setAccountId(null);
    setCategoryId(null);
    setType(null);
    setIncludeDrafts(false);
  };

  // Custom event style getter
  const eventStyleGetter = useCallback((event) => {
    return {
      style: getEventStyle(event),
    };
  }, []);

  // Calendar messages for localization
  const messages = useMemo(
    () => ({
      ...getCalendarMessages(t),
      noEventsInRange: (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <span className="text-lg font-bold text-white mb-2">
            No Transactions
          </span>
          <p className="text-zinc-400 text-sm">
            Click on any date to create a new transaction, or click the button
            below to get started.
          </p>
        </div>
      ),
    }),
    [t]
  );

  return (
    <PageLayout
      title={t("calendar.title")}
      subtitle={t("calendar.subtitle")}
      icon={Calendar}
      action={
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            <Filter size={20} className="mr-2" />
            {t("reports.filters")}
          </Button>
          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setIsModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
          >
            <Plus size={20} className="mr-2" />
            {t("calendar.createTransaction")}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <SummaryCards totals={totals} isLoading={isLoading} />

        {/* Filters */}
        {showFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <TransactionFilters
              accountId={accountId}
              categoryId={categoryId}
              type={type}
              includeDrafts={includeDrafts}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}

        {/* Calendar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="calendar-loading">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-zinc-400">{t("common.loading")}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 h-full">
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "calc(100dvh - 240px)", minHeight: "600px" }}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                view={currentView}
                date={currentDate}
                selectable
                popup
                showAllEvents
                eventPropGetter={eventStyleGetter}
                messages={messages}
                culture={i18n.language === "es" ? "es" : "en-US"}
                views={["month", "week", "day", "agenda"]}
                step={60}
                showMultiDayTimes
                defaultDate={new Date()}
              />
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>{t("transactions.income")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>{t("transactions.expense")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span>{t("transactions.transfer")}</span>
            </div>
            <div className="flex-1"></div>
            <div className="text-zinc-500">
              {t("calendar.clickToCreate")} • {t("calendar.clickToView")}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Creation Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDate(null);
        }}
        initialDate={selectedDate}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </PageLayout>
  );
}
