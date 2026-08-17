"use client";

import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, GraduationCap, ArrowRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import type { Tier } from "@/lib/tier";

interface PaywallBannerProps {
  featureLabel: string;
  requiredTier: Tier;
  /** Compact variant for inline use within panels */
  compact?: boolean;
  /** Description override */
  description?: string;
}

const TIER_CONFIG: Record<Tier, { icon: typeof Lock; color: string; badgeVariant: "default" | "secondary" | "outline"; price: string; description: string }> = {
  pro: {
    icon: Sparkles,
    color: "text-brand",
    badgeVariant: "default",
    price: "$9/mo",
    description: "Unlock AI-powered study tools, unlimited subjects, and smart insights.",
  },
  scholar: {
    icon: GraduationCap,
    color: "text-amber-500",
    badgeVariant: "default",
    price: "$19/mo",
    description: "Get everything in Pro plus exam prep, mock quizzes, study groups, and more.",
  },
};

export function PaywallBanner({ featureLabel, requiredTier, compact = false, description }: PaywallBannerProps) {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const config = TIER_CONFIG[requiredTier];
  const Icon = config.icon;

  const handleUpgrade = () => setAppRoute("billing");

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-dashed border-2 border-border bg-muted/30">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-soft " + config.color}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{featureLabel} is locked</h3>
                <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                  <Crown className="mr-1 h-2.5 w-2.5" />
                  {requiredTier}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description || config.description}
              </p>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5" onClick={handleUpgrade}>
              Upgrade <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex min-h-[60vh] items-center justify-center p-4"
    >
      <Card className="w-full max-w-md border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div className={"flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-card shadow-soft ring-1 ring-border/50 " + config.color}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold font-display">
              Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {description || `${featureLabel} requires a ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} subscription. ${config.description}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant} className="gap-1 text-xs px-2.5 py-1">
              <Crown className="h-3 w-3" />
              {requiredTier}
            </Badge>
            <span className="text-sm font-medium">from {config.price}</span>
          </div>
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setAppRoute("dashboard")}>
              Go back
            </Button>
            <Button className="flex-1 gap-2" onClick={handleUpgrade}>
              <Sparkles className="h-4 w-4" /> Upgrade now
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Cancel anytime. No hidden fees.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Inline paywall for sub-features within a panel (e.g. AI flashcard gen button) */
export function InlinePaywall({ feature, requiredTier }: { feature: string; requiredTier: Tier }) {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const config = TIER_CONFIG[requiredTier];
  const Icon = config.icon;

  return (
    <Card className="border-dashed border-2 border-border bg-muted/20">
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={"h-4 w-4 shrink-0 " + config.color} />
        <p className="flex-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{feature}</span> requires{" "}
          <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0 mx-0.5 align-middle">
            {requiredTier}
          </Badge>
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAppRoute("billing")}>
          Upgrade <ArrowRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
