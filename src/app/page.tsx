"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useUI, useAuthStore } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Landing } from "@/components/marketing/landing";
import { FeaturesPage } from "@/components/marketing/features-page";
import { ContactPage } from "@/components/marketing/contact-page";
import { LegalPage } from "@/components/marketing/legal-page";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { BackToTop } from "@/components/shared/back-to-top";
import { OnboardingDialog } from "@/components/auth/onboarding-dialog";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { ToastHost } from "@/components/shared/toast-host";
import { CommandPalette } from "@/components/shared/command-palette";
import { MobileDrawer } from "@/components/shared/mobile-drawer";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const AppShell = dynamic(() => import("@/components/app/app-shell").then((m) => m.AppShell), {
  loading: () => <FullScreenLoader />,
  ssr: false,
});
const AdminShell = dynamic(() => import("@/components/admin/admin-shell").then((m) => m.AdminShell), {
  loading: () => <FullScreenLoader />,
  ssr: false,
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Logo size={36} />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export default function Page() {
  const view = useUI((s) => s.view);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // guard app/admin views
  useEffect(() => {
    if (!loading && !user && (view === "app" || view === "admin")) {
      useUI.getState().setView("home");
      useUI.getState().openAuth("login");
    }
  }, [loading, user, view]);

  // scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  // global keyboard shortcuts - uses getState() to avoid unstable dep references
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const s = useUI.getState();
        if (useAuthStore.getState().user) {
          s.setCommandOpen(!s.commandOpen);
        } else {
          s.openAuth("login");
        }
      }
      if (e.key === "Escape") {
        const s = useUI.getState();
        if (s.view !== "home" && !s.authOpen) {
          s.setView("home");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // redirect non-admin away from admin view
  useEffect(() => {
    if (view === "admin" && user && user.role !== "admin") {
      useUI.getState().setView("app");
    }
  }, [view, user]);

  if ((view === "app" || view === "admin") && !loading && user) {
    if (view === "admin" && user.role !== "admin") {
      return <FullScreenLoader />;
    }
    return (
      <>
        {view === "app" ? <AppShell /> : <AdminShell />}
        <BackToTop />
        <AuthDialog />
        {view === "app" && <OnboardingDialog />}
        <CommandPalette />
        <ToastHost />
        <CookieBanner />
      </>
    );
  }

  const isMarketing = view === "home" || view === "features" || view === "contact" || view === "privacy" || view === "terms" || view === "cookies" || view === "pricing";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isMarketing && <MobileDrawer />}
      {view === "home" && (
        <>
          <SiteHeader />
          <div className="flex-1">
            <Landing />
          </div>
          <SiteFooter />
        </>
      )}
      {view === "features" && <FeaturesPage />}
      {view === "contact" && <ContactPage />}
      {view === "privacy" && <LegalPage kind="privacy" />}
      {view === "terms" && <LegalPage kind="terms" />}
      {view === "cookies" && <LegalPage kind="cookies" />}
      {view === "pricing" && (
        <>
          <SiteHeader />
          <div className="flex-1 pt-32">
            <PricingRedirect />
          </div>
          <SiteFooter />
        </>
      )}
      <BackToTop />
      <AuthDialog />
      <CommandPalette />
      <ToastHost />
      <CookieBanner />
    </div>
  );
}

function PricingRedirect() {
  const setView = useUI((s) => s.setView);
  useEffect(() => {
    setView("home");
    setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [setView]);
  return null;
}
