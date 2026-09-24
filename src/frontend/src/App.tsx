import { AppHeader } from "@/components/AppHeader";
import { AppFooter, Layout } from "@/components/Layout";
import { MonthlyReport } from "@/components/MonthlyReport";
import { OwnerWorkers } from "@/components/OwnerWorkers";
import { ProfileSetup } from "@/components/ProfileSetup";
import { ShiftClock } from "@/components/ShiftClock";
import { ShiftHistory } from "@/components/ShiftHistory";
import { SignInGate } from "@/components/SignInGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useShifts } from "@/hooks/use-shifts";
import { useEffect } from "react";

export default function App() {
  const auth = useAuth();
  const shifts = useShifts();

  useEffect(() => {
    document.title = "CrewClock — Shift Timekeeping";
    document.documentElement.classList.add("dark");
  }, []);

  if (auth.isInitializing) {
    return (
      <div
        data-ocid="app.loading_state"
        className="grid min-h-dvh place-items-center bg-background"
      >
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <SignInGate
        isInitializing={auth.isInitializing}
        isLoggingIn={auth.isLoggingIn}
        loginError={auth.loginError}
        onSignIn={auth.signIn}
      />
    );
  }

  if (auth.needsProfile) {
    return (
      <ProfileSetup
        isRegistering={auth.isRegistering}
        registerError={auth.registerError}
        onSubmit={auth.registerProfile}
        onSignOut={auth.signOut}
      />
    );
  }

  // Authenticated but the profile has not resolved yet (actor still warming up
  // or the profile query in flight): hold on the loading state rather than
  // rendering the app with an unknown role.
  if (!auth.profile) {
    return (
      <div
        data-ocid="app.loading_state"
        className="grid min-h-dvh place-items-center bg-background"
      >
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <Layout
      header={
        <AppHeader
          email={auth.profile?.email ?? null}
          userRole={auth.role}
          isOnline={shifts.isOnline}
          pendingCount={shifts.pendingCount}
          onSignOut={auth.signOut}
        />
      }
      footer={<AppFooter />}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <Tabs defaultValue="clock" className="gap-6">
          <TabsList
            data-ocid="app.tabs"
            className="grid w-full grid-cols-3 rounded-full bg-muted p-1 sm:w-auto sm:grid-flow-col sm:auto-cols-max"
          >
            <TabsTrigger
              value="clock"
              data-ocid="app.clock.tab"
              className="rounded-full"
            >
              Clock
            </TabsTrigger>
            <TabsTrigger
              value="history"
              data-ocid="app.history.tab"
              className="rounded-full"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              data-ocid="app.reports.tab"
              className="rounded-full"
            >
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clock" className="space-y-8">
            <ShiftClock shifts={shifts} />
            {auth.isOwner ? <OwnerWorkers /> : null}
          </TabsContent>

          <TabsContent value="history">
            <ShiftHistory shifts={shifts} isOwner={auth.isOwner} />
          </TabsContent>

          <TabsContent value="reports">
            <MonthlyReport isOwner={auth.isOwner} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
