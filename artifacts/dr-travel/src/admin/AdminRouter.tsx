import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import { ToastProvider } from "../components/Toast";
import { LanguageProvider } from "../LanguageContext";
import AdminLayout from "./AdminLayout";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import PackagesPage from "./PackagesPage";
import PackageFormPage from "./PackageFormPage";
import BookingsPage from "./BookingsPage";
import TestimonialsPage from "./TestimonialsPage";
import SettingsPage from "./SettingsPage";
import AdminRewardsPage from "./AdminRewardsPage";
import AdminGalleryPage from "./AdminGalleryPage";
import AdminCategoriesPage from "./AdminCategoriesPage";
import AdminServicesPage from "./AdminServicesPage";
import AdminServiceFormPage from "./AdminServiceFormPage";
import AdminWhyUsPage from "./AdminWhyUsPage";
import AdminWhyUsFormPage from "./AdminWhyUsFormPage";
import AdminHeroSlidesPage from "./AdminHeroSlidesPage";
import AdminShareCardPage from "./AdminShareCardPage";
import PushNotificationsPage from "./PushNotificationsPage";
import AdminScannerPage from "./AdminScannerPage";
import AdminAuditPage from "./AdminAuditPage";
import AdminPromoCodesPage from "./AdminPromoCodesPage";
import AdminReviewsPage from "./AdminReviewsPage";
import AdminWaitlistPage from "./AdminWaitlistPage";
import AdminCapacityPage from "./AdminCapacityPage";
import AdminUsersPage from "./AdminUsersPage";
import AdminCalendarPage from "./AdminCalendarPage";
import AdminStatsPage from "./AdminStatsPage";
import AdminAbandonedCartsPage from "./AdminAbandonedCartsPage";
import AdminCustomerPhotosPage from "./AdminCustomerPhotosPage";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdmin();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) navigate("/admin/login");
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", fontFamily: "Cairo, sans-serif" }}>
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
      <Route path="/admin/gallery">
        <AdminGuard><AdminGalleryPage /></AdminGuard>
      </Route>
      <Route path="/admin/categories">
        <AdminGuard><AdminCategoriesPage /></AdminGuard>
      </Route>
      <Route path="/admin/services/new">
        <AdminGuard><AdminServiceFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/services/:id/edit">
        <AdminGuard><AdminServiceFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/services">
        <AdminGuard><AdminServicesPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us/new">
        <AdminGuard><AdminWhyUsFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us/:id/edit">
        <AdminGuard><AdminWhyUsFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us">
        <AdminGuard><AdminWhyUsPage /></AdminGuard>
      </Route>
      <Route path="/admin/hero-slides">
        <AdminGuard><AdminHeroSlidesPage /></AdminGuard>
      </Route>
      <Route path="/admin/push">
        <AdminGuard><PushNotificationsPage /></AdminGuard>
      </Route>
      <Route path="/admin/share-card">
        <AdminGuard><AdminShareCardPage /></AdminGuard>
      </Route>
      <Route path="/admin/scanner">
        <AdminGuard><AdminScannerPage /></AdminGuard>
      </Route>
      <Route path="/admin/audit">
        <AdminGuard><AdminAuditPage /></AdminGuard>
      </Route>
      <Route path="/admin/promo-codes">
        <AdminGuard><AdminPromoCodesPage /></AdminGuard>
      </Route>
      <Route path="/admin/reviews">
        <AdminGuard><AdminReviewsPage /></AdminGuard>
      </Route>
      <Route path="/admin/waitlist">
        <AdminGuard><AdminWaitlistPage /></AdminGuard>
      </Route>
      <Route path="/admin/capacity">
        <AdminGuard><AdminCapacityPage /></AdminGuard>
      </Route>
      <Route path="/admin/users">
        <AdminGuard><AdminUsersPage /></AdminGuard>
      </Route>
      <Route path="/admin/calendar">
        <AdminGuard><AdminCalendarPage /></AdminGuard>
      </Route>
      <Route path="/admin/stats">
        <AdminGuard><AdminStatsPage /></AdminGuard>
      </Route>
      <Route path="/admin/abandoned-carts">
        <AdminGuard><AdminAbandonedCartsPage /></AdminGuard>
      </Route>
      <Route path="/admin/customer-photos">
        <AdminGuard><AdminCustomerPhotosPage /></AdminGuard>
      </Route>
      <Route path="/admin">
        <AdminGuard><DashboardPage /></AdminGuard>
      </Route>
    </Switch>
  );
}

export default function AdminRouter() {
  return (
    <LanguageProvider>
      <AdminProvider>
        <ToastProvider>
          <AdminRoutes />
        </ToastProvider>
      </AdminProvider>
    </LanguageProvider>
  );
}
