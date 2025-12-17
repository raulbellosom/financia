import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountDetails from "./pages/AccountDetails";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/AdminUsers";
import Transactions from "./pages/Transactions";
import InstallmentPlans from "./pages/InstallmentPlans";
import Alarms from "./pages/Alarms";
import CalendarView from "./pages/CalendarView";
import Receipts from "./pages/Receipts";
import Categories from "./pages/Categories";
import RecurringRules from "./pages/RecurringRules";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<PrivateRoute />}>
              <Route
                element={
                  <Layout>
                    <Outlet />
                  </Layout>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:id" element={<AccountDetails />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/recurring-rules" element={<RecurringRules />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/installments" element={<InstallmentPlans />} />
                <Route path="/alarms" element={<Alarms />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/onboarding" element={<Navigate to="/" />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#18181b",
                color: "#fff",
                border: "1px solid #27272a",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
