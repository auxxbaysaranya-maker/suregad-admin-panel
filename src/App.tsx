import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "./store/session";
import { panel, panelsFor, type PanelKey } from "./lib/panels";
import { PanelShell } from "./components/PanelShell";
import { ForgotPasswordPage, LoginPage, SignupPage } from "./pages/auth/AuthPages";
import { PartnerJobsPage } from "./pages/partner/PartnerPages";
import { PartnerEarnings, PartnerJobPage } from "./pages/partner/PartnerJob";
import { AdminHome, AdminListings, AdminPeople } from "./pages/admin/AdminPages";
import { AdminConfigure } from "./pages/admin/AdminConfigure";
import { AdminFeatured, AdminShowroomDetail, AdminShowrooms, AdminSupport } from "./pages/admin/Showrooms";
import { useShowroom } from "./pages/showroom/shared";
import { ShowroomOnboarding } from "./pages/showroom/Onboarding";
import { ShowroomDashboard } from "./pages/showroom/Dashboard";
import { ProductFormPage, ProductsPage } from "./pages/showroom/Products";
import { InventoryPage } from "./pages/showroom/Inventory";
import { DeliveryPage, OrdersPage } from "./pages/showroom/Orders";
import { AnalyticsPage, CustomersPage, InspectionsPage, PaymentsPage, PromotionsPage, ReturnsPage, ReviewsPage, ServicePartnersPage, SubscriptionPage } from "./pages/showroom/Sales";
import { BusinessProfilePage, SettingsPage } from "./pages/showroom/Profile";
import { MessagesPage } from "./pages/shared/Messages";
import { SupportPage } from "./pages/shared/Support";

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <Loader2 className="animate-spin text-brand-600" size={28} />
    </div>
  );
}

/** Opens a panel only for accounts with its role; everyone else goes to login or their own panel. */
function RequirePanel({ which, children, locked }: { which: PanelKey; children: ReactNode; locked?: boolean }) {
  const { ready, profile } = useSession();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile.roles.includes(panel(which).role)) return <Navigate to="/" replace />;
  return <PanelShell current={which} locked={locked}>{children}</PanelShell>;
}

/**
 * Seller tools need an approved showroom. The server checks this on every request too;
 * this only decides which screen to show.
 */
function Seller({ children, open = false }: { children: ReactNode; open?: boolean }) {
  const { ready, profile } = useSession();
  const showroom = useShowroom();
  if (!ready) return <Loading />;
  if (!profile) return <RequirePanel which="seller">{null}</RequirePanel>;
  if (!profile.roles.includes("business_seller")) return <Navigate to="/" replace />;
  if (showroom.isLoading) return <Loading />;
  const approved = showroom.data?.status === "approved";
  if (!approved && !open) return <Navigate to="/seller/onboarding" replace />;
  return <RequirePanel which="seller" locked={!approved}>{children}</RequirePanel>;
}

/** "/" sends a signed-in user to the first panel their roles allow. */
function Home() {
  const { ready, profile } = useSession();
  if (!ready) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  const panels = panelsFor(profile.roles);
  if (!panels.length) return <Navigate to="/login" replace state={{ noAccess: true }} />;
  return <Navigate to={panels[0]!.path} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/seller" element={<Navigate to="/seller/dashboard" replace />} />
        <Route path="/seller/onboarding" element={<Seller open><ShowroomOnboarding /></Seller>} />
        <Route path="/seller/dashboard" element={<Seller><ShowroomDashboard /></Seller>} />
        <Route path="/seller/products" element={<Seller><ProductsPage /></Seller>} />
        <Route path="/seller/products/:id" element={<Seller><ProductFormPage /></Seller>} />
        <Route path="/seller/inventory" element={<Seller><InventoryPage /></Seller>} />
        <Route path="/seller/orders" element={<Seller><OrdersPage /></Seller>} />
        <Route path="/seller/delivery" element={<Seller><DeliveryPage /></Seller>} />
        <Route path="/seller/customers" element={<Seller><CustomersPage /></Seller>} />
        <Route path="/seller/messages" element={<Seller><MessagesPage basePath="/seller" /></Seller>} />
        <Route path="/seller/messages/:id" element={<Seller><MessagesPage basePath="/seller" /></Seller>} />
        <Route path="/seller/inspections" element={<Seller><InspectionsPage /></Seller>} />
        <Route path="/seller/service-partners" element={<Seller><ServicePartnersPage /></Seller>} />
        <Route path="/seller/promotions" element={<Seller><PromotionsPage /></Seller>} />
        <Route path="/seller/reviews" element={<Seller><ReviewsPage /></Seller>} />
        <Route path="/seller/payments" element={<Seller><PaymentsPage /></Seller>} />
        <Route path="/seller/returns" element={<Seller><ReturnsPage /></Seller>} />
        <Route path="/seller/analytics" element={<Seller><AnalyticsPage /></Seller>} />
        <Route path="/seller/subscription" element={<Seller><SubscriptionPage /></Seller>} />
        <Route path="/seller/business-profile" element={<Seller><BusinessProfilePage /></Seller>} />
        <Route path="/seller/settings" element={<Seller><SettingsPage /></Seller>} />
        <Route path="/seller/support" element={<Seller open><SupportPage basePath="/seller" /></Seller>} />
        <Route path="/seller/support/:id" element={<Seller open><SupportPage basePath="/seller" /></Seller>} />
        <Route path="/seller/*" element={<Navigate to="/seller/dashboard" replace />} />

        <Route path="/partner" element={<RequirePanel which="partner"><PartnerJobsPage /></RequirePanel>} />
        <Route path="/partner/jobs/:id" element={<RequirePanel which="partner"><PartnerJobPage /></RequirePanel>} />
        <Route path="/partner/earnings" element={<RequirePanel which="partner"><PartnerEarnings /></RequirePanel>} />
        <Route path="/partner/messages" element={<RequirePanel which="partner"><MessagesPage basePath="/partner" /></RequirePanel>} />
        <Route path="/partner/messages/:id" element={<RequirePanel which="partner"><MessagesPage basePath="/partner" /></RequirePanel>} />
        <Route path="/partner/support" element={<RequirePanel which="partner"><SupportPage basePath="/partner" /></RequirePanel>} />
        <Route path="/partner/support/:id" element={<RequirePanel which="partner"><SupportPage basePath="/partner" /></RequirePanel>} />

        <Route path="/admin" element={<RequirePanel which="admin"><AdminHome /></RequirePanel>} />
        <Route path="/admin/showrooms" element={<RequirePanel which="admin"><AdminShowrooms /></RequirePanel>} />
        <Route path="/admin/showrooms/:id" element={<RequirePanel which="admin"><AdminShowroomDetail /></RequirePanel>} />
        <Route path="/admin/featured" element={<RequirePanel which="admin"><AdminFeatured /></RequirePanel>} />
        <Route path="/admin/support" element={<RequirePanel which="admin"><AdminSupport /></RequirePanel>} />
        <Route path="/admin/support/:id" element={<RequirePanel which="admin"><AdminSupport /></RequirePanel>} />
        <Route path="/admin/listings" element={<RequirePanel which="admin"><AdminListings /></RequirePanel>} />
        <Route path="/admin/people" element={<RequirePanel which="admin"><AdminPeople /></RequirePanel>} />
        <Route path="/admin/configure" element={<RequirePanel which="admin"><AdminConfigure /></RequirePanel>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
