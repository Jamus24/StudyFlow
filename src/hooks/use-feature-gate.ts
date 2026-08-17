"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import { tierSatisfies, ROUTE_TIERS, FEATURE_TIERS, type Tier } from "@/lib/tier";

export interface FeatureGateResult {
  /** Whether the current user can access the feature */
  allowed: boolean;
  /** The tier required for this feature (null if always allowed) */
  requiredTier: Tier | null;
  /** The user's current tier */
  currentTier: string;
  /** Label for the required feature (e.g. "AI Tutor") */
  featureLabel: string;
}

/**
 * Check if an app route is accessible for the current user.
 * For sub-feature checks within a panel, use `checkFeature` directly.
 */
export function useFeatureGate(route: string): FeatureGateResult {
  const user = useAuthStore((s) => s.user);
  const planTier = user?.planTier ?? "free";

  return useMemo(() => {
    const routeConfig = ROUTE_TIERS[route];
    if (!routeConfig) {
      return { allowed: true, requiredTier: null, currentTier: planTier, featureLabel: "" };
    }
    return {
      allowed: tierSatisfies(planTier, routeConfig.tier),
      requiredTier: routeConfig.tier,
      currentTier: planTier,
      featureLabel: routeConfig.label,
    };
  }, [route, planTier]);
}

/** Sync helper — can be called in any component */
export function checkFeature(featureKey: string, planTier: string): { allowed: boolean; requiredTier: Tier | null } {
  const config = FEATURE_TIERS[featureKey];
  if (!config) return { allowed: true, requiredTier: null };
  return { allowed: tierSatisfies(planTier, config.tier), requiredTier: config.tier };
}
