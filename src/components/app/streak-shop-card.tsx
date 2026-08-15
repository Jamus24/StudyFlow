"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Snowflake, ShoppingBag, Sparkles, Check, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopItem {
  id: string;
  label: string;
  cost: number;
  icon: string;
  description: string;
  bestValue?: boolean;
}

interface ShopData {
  points: number;
  freezesAvailable: number;
  totalMinutes: number;
  achievements: number;
  items: ShopItem[];
}

export function StreakShopCard() {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<ShopData>({
    queryKey: ["/api/streak/shop"],
    queryFn: () => api("/api/streak/shop"),
  });

  const purchase = useMutation({
    mutationFn: (itemId: string) => api("/api/streak/shop", { method: "POST", json: { itemId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["/api/streak/shop"] });
      qc.invalidateQueries({ queryKey: ["/api/streak"] });
      pushToast({
        title: `+${res.freezesGranted} freeze${res.freezesGranted > 1 ? "s" : ""} purchased!`,
        description: `${res.pointsSpent} points spent · ${res.pointsRemaining} remaining`,
        variant: "success",
      });
      setOpen(false);
    },
    onError: (e: any) => pushToast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !data) return null;

  return (
    <>
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Study Shop</h3>
              <p className="text-[10px] text-muted-foreground">Spend points on streak freezes</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold tabular-nums text-gradient-brand">{data.points}</p>
            <p className="text-[10px] text-muted-foreground">points</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            <p className="font-mono text-sm font-semibold">{data.totalMinutes}m</p>
            <p className="text-[9px] text-muted-foreground">studied</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            <p className="font-mono text-sm font-semibold">{data.achievements}</p>
            <p className="text-[9px] text-muted-foreground">badges</p>
          </div>
          <div className="rounded-lg bg-cyan-500/10 px-2 py-1.5">
            <p className="font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400">{data.freezesAvailable}</p>
            <p className="text-[9px] text-muted-foreground">freezes</p>
          </div>
        </div>

        <Button className="mt-4 w-full gap-1.5" variant="outline" onClick={() => setOpen(true)}>
          <Snowflake className="h-3.5 w-3.5" /> Browse shop
        </Button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogTitle className="font-display text-lg font-semibold">Study Shop</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Earn points by studying (1pt/min) and unlocking badges (50pt each). Spend them on streak freezes.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm">
              <Star className="h-3.5 w-3.5 text-amber-500" /> Your balance
            </span>
            <span className="font-display text-lg font-semibold text-gradient-brand">{data.points} pts</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {data.items.map((item, i) => {
              const canAfford = data.points >= item.cost;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border p-3.5",
                    item.bestValue ? "border-brand/30 bg-brand/5" : "border-border bg-card"
                  )}
                >
                  {item.bestValue && (
                    <Badge className="absolute -top-2 left-3 rounded-full bg-brand text-brand-foreground text-[9px]">
                      <Sparkles className="mr-1 h-2.5 w-2.5" /> Best value
                    </Badge>
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                    <Snowflake className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant={canAfford ? "default" : "outline"}
                      disabled={!canAfford || purchase.isPending}
                      onClick={() => purchase.mutate(item.id)}
                      className="gap-1.5"
                    >
                      {canAfford ? <><Zap className="h-3 w-3" /> {item.cost}</> : `${item.cost} pts`}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-4 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
            Points are earned automatically – no grinding required, just study.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
