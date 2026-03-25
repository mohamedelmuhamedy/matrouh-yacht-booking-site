import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import { ToastProvider } from "../components/Toast";
import AdminLayout from "./AdminLayout";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import PackagesPage from "./PackagesPage";
import PackageFormPage from "./PackageFormPage";
import BookingsPage from "./BookingsPage";
import TestimonialsPage from "./TestimonialsPage";
import SettingsPage from "./SettingsPage";
import AdminRewardsPage from "./AdminRewardsPage";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdmin();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) navigate("/admin/login");
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1B2A", fontFamily: "Cairo, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "#00AAFF", fontSize: "1.1rem" }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <AdminLayout>{children}</AdminLayout>;
}

function AdminRoutes() {
  const { user, isLoading } = useAdmin();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user && (location === "/admin" || location === "/admin/login")) {
      navigate("/admin/dashboard");
    }
  }, [user, isLoading, location]);

  return (
    <Switch>
      <Route path="/admin/login" component={LoginPage} />
      <Route path="/admin/dashboard">
        <AdminGuard><DashboardPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages/new">
        <AdminGuard><PackageFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages/:id/edit">
        <AdminGuard><PackageFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages">
        <AdminGuard><PackagesPage /></AdminGuard>
      </Route>
      <Route path="/admin/bookings">
        <AdminGuard><BookingsPage /></AdminGuard>
      </Route>
      <Route path="/admin/testimonials">
        <AdminGuard><TestimonialsPage /></AdminGuard>
      </Route>
      <Route path="/admin/settings">
        <AdminGuard><SettingsPage /></AdminGuard>
      </Route>
      <Route path="/admin/rewards">
        <AdminGuard><AdminRewardsPage /></AdminGuard>
      </Route>
      <Route path="/admin">
        <AdminGuard><DashboardPage /></AdminGuard>
      </Route>
    </Switch>
  );
}

export default function AdminRouter() {
  return (
    <AdminProvider>
      <ToastProvider>
        <AdminRoutes />
      </ToastProvider>
    </AdminProvider>
  );
}
