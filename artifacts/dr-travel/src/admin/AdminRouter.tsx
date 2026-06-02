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
import AdminManualTicketsPage from "./AdminManualTicketsPage";
import AdminPaymentGatewayPage from "./AdminPaymentGatewayPage";
import type { AdminPermission } from "./permissions";

const FIRST_PATH_BY_PERMISSION: { path: string; permission: AdminPermission }[] = [
  { path: "/admin/dashboard", permission: "dashboard.view" },
  { path: "/admin/bookings", permission: "bookings.view" },
  { path: "/admin/payment-gateway", permission: "payment_gateway.view" },
  { path: "/admin/manual-tickets", permission: "manual_tickets.view" },
  { path: "/admin/stats", permission: "stats.view" },
  { path: "/admin/packages", permission: "trips.manage" },
  { path: "/admin/settings", permission: "settings.manage" },
];

function AdminGuard({ children, permission }: { children: React.ReactNode; permission?: AdminPermission }) {
  const { user, isLoading, hasPermission } = useAdmin();
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
  if (!hasPermission(permission)) {
    return (
      <AdminLayout>
        <div style={{ padding: "2rem", textAlign: "center", color: "#EF4444", fontWeight: 800 }}>
          لا تملك صلاحية الوصول لهذه الصفحة
        </div>
      </AdminLayout>
    );
  }
  return <AdminLayout>{children}</AdminLayout>;
}

function AdminRoutes() {
  const { user, isLoading, hasPermission } = useAdmin();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user && (location === "/admin" || location === "/admin/login")) {
      const first = FIRST_PATH_BY_PERMISSION.find(item => hasPermission(item.permission));
      navigate(first?.path || "/admin/dashboard");
    }
  }, [user, isLoading, location, hasPermission]);

  return (
    <Switch>
      <Route path="/admin/login" component={LoginPage} />
      <Route path="/admin/dashboard">
        <AdminGuard permission="dashboard.view"><DashboardPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages/new">
        <AdminGuard permission="trips.manage"><PackageFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages/:id/edit">
        <AdminGuard permission="trips.manage"><PackageFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/packages">
        <AdminGuard permission="trips.manage"><PackagesPage /></AdminGuard>
      </Route>
      <Route path="/admin/bookings">
        <AdminGuard permission="bookings.view"><BookingsPage /></AdminGuard>
      </Route>
      <Route path="/admin/manual-tickets">
        <AdminGuard permission="manual_tickets.view"><AdminManualTicketsPage /></AdminGuard>
      </Route>
      <Route path="/admin/payment-gateway">
        <AdminGuard permission="payment_gateway.view"><AdminPaymentGatewayPage /></AdminGuard>
      </Route>
      <Route path="/admin/testimonials">
        <AdminGuard permission="testimonials.manage"><TestimonialsPage /></AdminGuard>
      </Route>
      <Route path="/admin/settings">
        <AdminGuard permission="settings.manage"><SettingsPage /></AdminGuard>
      </Route>
      <Route path="/admin/rewards">
        <AdminGuard permission="rewards.manage"><AdminRewardsPage /></AdminGuard>
      </Route>
      <Route path="/admin/gallery">
        <AdminGuard permission="gallery.manage"><AdminGalleryPage /></AdminGuard>
      </Route>
      <Route path="/admin/categories">
        <AdminGuard permission="categories.manage"><AdminCategoriesPage /></AdminGuard>
      </Route>
      <Route path="/admin/services/new">
        <AdminGuard permission="services.manage"><AdminServiceFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/services/:id/edit">
        <AdminGuard permission="services.manage"><AdminServiceFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/services">
        <AdminGuard permission="services.manage"><AdminServicesPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us/new">
        <AdminGuard permission="why_us.manage"><AdminWhyUsFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us/:id/edit">
        <AdminGuard permission="why_us.manage"><AdminWhyUsFormPage /></AdminGuard>
      </Route>
      <Route path="/admin/why-us">
        <AdminGuard permission="why_us.manage"><AdminWhyUsPage /></AdminGuard>
      </Route>
      <Route path="/admin/hero-slides">
        <AdminGuard permission="hero_slides.manage"><AdminHeroSlidesPage /></AdminGuard>
      </Route>
      <Route path="/admin/push">
        <AdminGuard permission="push.manage"><PushNotificationsPage /></AdminGuard>
      </Route>
      <Route path="/admin/share-card">
        <AdminGuard permission="share_card.manage"><AdminShareCardPage /></AdminGuard>
      </Route>
      <Route path="/admin/scanner">
        <AdminGuard permission="scanner.use"><AdminScannerPage /></AdminGuard>
      </Route>
      <Route path="/admin/audit">
        <AdminGuard permission="audit.view"><AdminAuditPage /></AdminGuard>
      </Route>
      <Route path="/admin/promo-codes">
        <AdminGuard permission="promo_codes.manage"><AdminPromoCodesPage /></AdminGuard>
      </Route>
      <Route path="/admin/reviews">
        <AdminGuard permission="reviews.manage"><AdminReviewsPage /></AdminGuard>
      </Route>
      <Route path="/admin/waitlist">
        <AdminGuard permission="waiting_list.manage"><AdminWaitlistPage /></AdminGuard>
      </Route>
      <Route path="/admin/capacity">
        <AdminGuard permission="capacity.manage"><AdminCapacityPage /></AdminGuard>
      </Route>
      <Route path="/admin/users">
        <AdminGuard permission="users.manage"><AdminUsersPage /></AdminGuard>
      </Route>
      <Route path="/admin/calendar">
        <AdminGuard permission="calendar.view"><AdminCalendarPage /></AdminGuard>
      </Route>
      <Route path="/admin/stats">
        <AdminGuard permission="stats.view"><AdminStatsPage /></AdminGuard>
      </Route>
      <Route path="/admin/abandoned-carts">
        <AdminGuard permission="abandoned_carts.manage"><AdminAbandonedCartsPage /></AdminGuard>
      </Route>
      <Route path="/admin/customer-photos">
        <AdminGuard permission="customer_photos.manage"><AdminCustomerPhotosPage /></AdminGuard>
      </Route>
      <Route path="/admin">
        <AdminGuard permission="dashboard.view"><DashboardPage /></AdminGuard>
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
