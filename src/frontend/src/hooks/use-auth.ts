import { createActor } from "@/backend";
import type { CrewClockBackend, Role, WorkerView } from "@/types";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

/** The typed view of the generated actor, covering the full CrewClock API. */
export function useBackendActor(): CrewClockBackend | null {
  const { actor } = useActor(createActor);
  return (actor as unknown as CrewClockBackend | null) ?? null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError?: Error;
  profile: WorkerView | null;
  role: Role | null;
  isOwner: boolean;
  isProfileLoading: boolean;
  /** True when the signed-in account has no profile yet and must set one up. */
  needsProfile: boolean;
  isRegistering: boolean;
  registerError: string | null;
  registerProfile: (email: string, name: string) => void;
  signIn: () => void;
  signOut: () => void;
}

/**
 * Resolve the signed-in worker's profile and role.
 *
 * On first sign-in the worker supplies the email their crew knows them by; the
 * backend stores it as their identity and designates the first account owner.
 */
export function useAuth(): AuthState {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    loginError,
  } = useInternetIdentity();
  const actor = useBackendActor();
  const queryClient = useQueryClient();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const principal = identity?.getPrincipal().toText() ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", principal],
    queryFn: async (): Promise<WorkerView | null> => {
      if (!actor) return null;
      return actor.getCallerProfile();
    },
    enabled: !!actor && isAuthenticated && !!principal,
  });

  // The access-control admin flag is the authoritative owner signal. The
  // sign-in flow initializes access control before `registerProfile` runs, so
  // the first account is admin here even when its stored profile role still
  // reads `worker`; the profile role is only a fallback.
  const adminQuery = useQuery({
    queryKey: ["is-admin", principal],
    queryFn: async (): Promise<boolean> => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && isAuthenticated && !!principal,
  });

  const registerMutation = useMutation({
    mutationFn: async (input: {
      email: string;
      name: string;
    }): Promise<WorkerView> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.registerProfile(input.email, input.name);
    },
    onSuccess: () => {
      setRegisterError(null);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: () => {
      setRegisterError("Could not save your profile. Please try again.");
    },
  });

  const { mutate: runRegister, isPending: isRegistering } = registerMutation;

  const registerProfile = useCallback(
    (email: string, name: string) => {
      setRegisterError(null);
      runRegister({ email: email.trim(), name: name.trim() });
    },
    [runRegister],
  );

  const signIn = useCallback(() => {
    login();
  }, [login]);

  const signOut = useCallback(() => {
    setRegisterError(null);
    queryClient.clear();
    clear();
  }, [clear, queryClient]);

  const profile = profileQuery.data ?? null;
  const isOwner = adminQuery.data === true || profile?.role === "owner";

  return {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    loginError,
    profile,
    role: profile ? (isOwner ? "owner" : "worker") : null,
    isOwner,
    isProfileLoading: isAuthenticated && profileQuery.isLoading,
    needsProfile:
      isAuthenticated &&
      !!actor &&
      !profileQuery.isLoading &&
      !profileQuery.isError &&
      profile === null,
    isRegistering,
    registerError,
    registerProfile,
    signIn,
    signOut,
  };
}
