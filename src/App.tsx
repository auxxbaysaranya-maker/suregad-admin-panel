import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "./store/session";
import { panel, panelsFor, type PanelKey } from "./lib/panels";
import { PanelShell } from "./components/PanelShell";
import { LoginPage, SignupPage } from "./pages/auth/AuthPages";
import { NewListingPage, SellerDashboard, SellerOrdersPage } from "./pages/seller/SellerPages";
import { StorefrontEditor } from "./pages/seller/Storefront";
import { PartnerJobsPage } from "./pages/partner/PartnerPages";
import { PartnerEarnings, PartnerJobPage } from "./pages/partner/PartnerJob";
import { AdminHome, AdminListings, AdminPeople } from "./pages/admin/AdminPages";
import { AdminConfigure } from "./pages/admin/AdminConfigure";

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <Loader2 className="animate-spin text-brand-600" size={28} />
    </div>
  );
}

/** Opens a panel only for accounts with its role; everyone else goes to login or their own panel. */
function RequirePanel({ which, children }: { which: PanelKey; children: React.ReactNode }) {
  const { ready, profile } = useSession();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile.roles.includes(panel(which).role)) return <Navigate to="/" replace />;
  return <PanelShell current={which}>{children}</PanelShell>;
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

        <Route path="/seller" element={<RequirePanel which="seller"><SellerDashboard /></RequirePanel>} />
        <Route path="/seller/listings/new" element={<RequirePanel which="seller"><NewListingPage /></RequirePanel>} />
        <Route path="/seller/orders" element={<RequirePanel which="seller"><SellerOrdersPage /></RequirePanel>} />
        <Route path="/seller/storefront" element={<RequirePanel which="seller"><StorefrontEditor /></RequirePanel>} />

        <Route path="/partner" element={<RequirePanel which="partner"><PartnerJobsPage /></RequirePanel>} />
        <Route path="/partner/jobs/:id" element={<RequirePanel which="partner"><PartnerJobPage /></RequirePanel>} />
        <Route path="/partner/earnings" element={<RequirePanel which="partner"><PartnerEarnings /></RequirePanel>} />

        <Route path="/admin" element={<RequirePanel which="admin"><AdminHome /></RequirePanel>} />
        <Route path="/admin/listings" element={<RequirePanel which="admin"><AdminListings /></RequirePanel>} />
        <Route path="/admin/people" element={<RequirePanel which="admin"><AdminPeople /></RequirePanel>} />
        <Route path="/admin/configure" element={<RequirePanel which="admin"><AdminConfigure /></RequirePanel>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
