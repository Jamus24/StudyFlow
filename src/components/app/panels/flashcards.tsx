"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader, EmptyState, LoadingBlock } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayersIcon } from "@/components/shared/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Sparkles,
  Search,
  Trash2,
  ArrowLeft,
  Pencil,
  Check,
  RotateCw,
  CheckCircle2,
  Brain,
  BookOpen,
  ChevronRight,
  Clock,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  color: string;
}
interface Deck {
  id: string;
  name: string;
  description?: string | null;
  subjectId?: string | null;
  subject?: { name: string; color: string } | null;
  _count: { cards: number };
  updatedAt: string;
}
interface Flashcard {
  id: string;
  front: string;
  back: string;
  ease: number;
  interval: number;
  reps: number;
  dueAt: string;
  lastReview?: string | null;
}
interface DeckDetail extends Deck {
  cards: Flashcard[];
}

const RATINGS = [
  { key: 0, label: "Again", hint: "1", color: "text-rose-500", border: "hover:border-rose-400/50 hover:bg-rose-500/5" },
  { key: 1, label: "Hard", hint: "2", color: "text-amber-500", border: "hover:border-amber-400/50 hover:bg-amber-500/5" },
  { key: 2, label: "Good", hint: "3", color: "text-blue-500", border: "hover:border-blue-400/50 hover:bg-blue-500/5" },
  { key: 3, label: "Easy", hint: "4", color: "text-sky-500", border: "hover:border-sky-400/50 hover:bg-sky-500/5" },
] as const;

export function FlashcardsPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<"cards" | "study">("cards");
  const [search, setSearch] = useState("");
  const [newDeckOpen, setNewDeckOpen] = useState(false);

  const decksQuery = useQuery<{ decks: Deck[] }>({
    queryKey: ["/api/decks"],
    queryFn: () => api("/api/decks"),
  });

  const deckQuery = useQuery<{ deck: DeckDetail }>({
    queryKey: ["/api/decks", activeDeckId],
    queryFn: () => api(`/api/decks/${activeDeckId}`),
    enabled: !!activeDeckId,
  });

  const createDeck = useMutation({
    mutationFn: (vars: { name: string; description?: string; subjectId?: string }) =>
      api<{ deck: Deck }>("/api/decks", { method: "POST", json: vars }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/api/decks"] });
      setNewDeckOpen(false);
      setActiveDeckId(res.deck.id);
      pushToast({ title: "Deck created", variant: "success" });
    },
    onError: (e: unknown) => {
      const err = e as Error;
      pushToast({
        title: "Couldn't create deck",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeck = useMutation({
    mutationFn: (id: string) => api(`/api/decks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/decks"] });
      setActiveDeckId(null);
      pushToast({ title: "Deck deleted", variant: "default" });
    },
    onError: () =>
      pushToast({ title: "Couldn't delete deck", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const list = decksQuery.data?.decks ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
    );
  }, [decksQuery.data, search]);

  return (
    <div className="flex flex-col">
      <PanelHeader
        title="Flashcards"
        description="Spaced repetition that remembers what you forget"
        icon={LayersIcon}
        actions={
          <Button size="sm" className="gap-2" onClick={() => setNewDeckOpen(true)}>
            <Plus className="h-4 w-4" /> New deck
          </Button>
        }
      />

      <AnimatePresence mode="wait">
        {activeDeckId ? (
          <motion.div
            key={`deck-${activeDeckId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {deckQuery.isLoading ? (
              <div className="space-y-3">
                <LoadingBlock className="h-16" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <LoadingBlock className="h-40" />
                  <LoadingBlock className="h-40" />
                </div>
              </div>
            ) : deckQuery.data?.deck ? (
              <DeckDetail
                deck={deckQuery.data.deck}
                initialTab={initialTab}
                onBack={() => setActiveDeckId(null)}
                onDelete={() => deleteDeck.mutate(activeDeckId)}
              />
            ) : (
              <EmptyState
                icon={LayersIcon}
                title="Couldn't open deck"
                description="It may have been deleted."
                action={{ label: "Back to decks", onClick: () => setActiveDeckId(null) }}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="deck-list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {decksQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingBlock key={i} className="h-44" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={LayersIcon}
                title={search ? "No matching decks" : "Your first deck"}
                description={
                  search
                    ? "Try a different search."
                    : "Group flashcards by topic, generate them from notes with AI, or add your own. Spaced repetition handles the rest."
                }
                action={
                  search
                    ? { label: "Clear search", onClick: () => setSearch("") }
                    : { label: "New deck", onClick: () => setNewDeckOpen(true) }
                }
              />
            ) : (
              <>
                <div className="mb-4 relative max-w-sm">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a deck"
                    className="h-9 pl-8 text-sm"
                    aria-label="Find a deck"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {filtered.map((d) => (
                      <DeckCard
                        key={d.id}
                        deck={d}
                        onOpen={() => {
                          setInitialTab("cards");
                          setActiveDeckId(d.id);
                        }}
                        onStudy={() => {
                          setInitialTab("study");
                          setActiveDeckId(d.id);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <NewDeckDialog
        open={newDeckOpen}
        onOpenChange={setNewDeckOpen}
        onCreate={(v) => createDeck.mutate(v)}
        creating={createDeck.isPending}
      />
    </div>
  );
}

/* ------------ Deck card (grid) ------------ */

function DeckCard({
  deck,
  onOpen,
  onStudy,
}: {
  deck: Deck;
  onOpen: () => void;
  onStudy: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
    >
      <Card className="card-hover group h-full gap-0 p-0">
        <button
          onClick={onOpen}
          className="flex w-full flex-1 flex-col p-5 text-left"
          aria-label={`Open deck ${deck.name}`}
        >
          <div className="mb-3 flex items-center justify-between">
            {deck.subject ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: deck.subject.color }} />
                {deck.subject.name}
              </span>
            ) : (
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                General
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight">{deck.name}</h3>
          {deck.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{deck.description}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60">No description yet.</p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <LayersIcon className="h-3.5 w-3.5" /> {deck._count.cards} cards
            </span>
            <span aria-hidden>·</span>
            <span>{timeAgo(deck.updatedAt)}</span>
          </div>
        </button>
        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpen}>
            <BookOpen className="h-3.5 w-3.5" /> Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto gap-1.5 text-brand hover:text-brand"
            onClick={onStudy}
          >
            Study <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/* ------------ Deck detail view ------------ */

function DeckDetail({
  deck,
  initialTab = "cards",
  onBack,
  onDelete,
}: {
  deck: DeckDetail;
  initialTab?: "cards" | "study";
  onBack: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dueCount = useMemo(
    () => deck.cards.filter((c) => new Date(c.dueAt).getTime() <= Date.now()).length,
    [deck.cards]
  );

  return (
    <div>
      {/* Header bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="ring-focus mt-0.5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Back to decks"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">{deck.name}</h2>
              {deck.subject && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: deck.subject.color }} />
                  {deck.subject.name}
                </span>
              )}
            </div>
            {deck.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{deck.description}</p>
            )}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{deck.cards.length} cards</span>
              <span aria-hidden>·</span>
              <span className={cn(dueCount > 0 && "text-brand font-medium")}>
                {dueCount} due now
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="cards" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Cards
          </TabsTrigger>
          <TabsTrigger value="study" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Study
            {dueCount > 0 && (
              <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-foreground">
                {dueCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          <CardsTab deckId={deck.id} cards={deck.cards} />
        </TabsContent>

        <TabsContent value="study">
          <StudyTab deckId={deck.id} dueCount={dueCount} totalCards={deck.cards.length} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deck?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deck.name}" and all {deck.cards.length} of its cards will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete deck
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------ Cards tab ------------ */

function CardsTab({ deckId, cards }: { deckId: string; cards: Flashcard[] }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [adding, setAdding] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  const addCard = useMutation({
    mutationFn: (vars: { front: string; back: string }) =>
      api<{ card: Flashcard }>(`/api/decks/${deckId}/review`, {
        method: "POST",
        json: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/decks", deckId] });
      qc.invalidateQueries({ queryKey: ["/api/decks"] });
      setFront("");
      setBack("");
      pushToast({ title: "Card added", variant: "success" });
    },
    onError: () => pushToast({ title: "Couldn't add card", variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) return;
    setAdding(true);
    addCard.mutate({ front: front.trim(), back: back.trim() }, { onSettled: () => setAdding(false) });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Cards list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {cards.length} card{cards.length === 1 ? "" : "s"}
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setGenOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Generate with AI
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-muted-foreground">
              <LayersIcon className="h-5 w-5" />
            </div>
            <h4 className="mt-3 font-display text-base font-semibold">No cards yet</h4>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Add your first card on the right, or use AI to generate a batch from notes.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {cards.map((c) => (
                <CardItem key={c.id} deckId={deckId} card={c} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Add card form */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="gap-0 p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold">Add a card</p>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <Label className="mb-1.5 text-xs text-muted-foreground">Front (question)</Label>
              <Textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="What is the powerhouse of the cell?"
                className="min-h-[72px] resize-none text-sm"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs text-muted-foreground">Back (answer)</Label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="The mitochondria – it produces ATP via cellular respiration."
                className="min-h-[72px] resize-none text-sm"
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleAdd}
              disabled={!front.trim() || !back.trim() || adding}
            >
              {adding ? <RotateCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add card
            </Button>
          </div>
        </Card>
      </div>

      <GenerateDialog
        deckId={deckId}
        open={genOpen}
        onOpenChange={setGenOpen}
      />
    </div>
  );
}

function CardItem({ deckId, card }: { deckId: string; card: Flashcard }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [saving, setSaving] = useState(false);
  const isDue = new Date(card.dueAt).getTime() <= Date.now();

  const update = useMutation({
    mutationFn: (vars: { front?: string; back?: string }) =>
      api<{ card: Flashcard }>(`/api/flashcards/${card.id}`, { method: "PATCH", json: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/decks", deckId] });
      setEditing(false);
      pushToast({ title: "Card updated", variant: "success" });
    },
    onError: () => pushToast({ title: "Couldn't save", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/flashcards/${card.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/decks", deckId] });
      qc.invalidateQueries({ queryKey: ["/api/decks"] });
      pushToast({ title: "Card deleted", variant: "default" });
    },
    onError: () => pushToast({ title: "Couldn't delete", variant: "destructive" }),
  });

  const save = () => {
    if (front === card.front && back === card.back) {
      setEditing(false);
      return;
    }
    setSaving(true);
    update.mutate({ front, back }, { onSettled: () => setSaving(false) });
  };

  const cancel = () => {
    setFront(card.front);
    setBack(card.back);
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15"
    >
      {editing ? (
        <div className="space-y-2.5">
          <Textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="min-h-[56px] resize-none text-sm font-medium"
            aria-label="Edit front"
          />
          <Textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="min-h-[56px] resize-none text-sm text-muted-foreground"
            aria-label="Edit back"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              {saving ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{card.front}</p>
            <div className="my-2 h-px bg-border" />
            <p className="text-sm leading-snug text-muted-foreground">{card.back}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                  isDue ? "bg-brand/10 text-brand" : "bg-accent text-muted-foreground"
                )}
              >
                <Clock className="h-3 w-3" />
                {isDue ? "Due now" : `In ${Math.max(1, Math.ceil((new Date(card.dueAt).getTime() - Date.now()) / 864e5))}d`}
              </span>
              {card.reps > 0 && <span>· {card.reps} review{card.reps === 1 ? "" : "s"}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit card"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => remove.mutate()}
              aria-label="Delete card"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

/* ------------ AI generate dialog ------------ */

function GenerateDialog({
  deckId,
  open,
  onOpenChange,
}: {
  deckId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [source, setSource] = useState("");
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const generate = useMutation({
    mutationFn: () =>
      api<{ cards: { front: string; back: string }[] }>("/api/flashcards/generate", {
        method: "POST",
        json: { source, count, difficulty },
      }),
    onSuccess: async (res) => {
      // persist each generated card
      for (const c of res.cards) {
        await api(`/api/decks/${deckId}/review`, {
          method: "POST",
          json: { front: c.front, back: c.back },
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/decks", deckId] });
      qc.invalidateQueries({ queryKey: ["/api/decks"] });
      onOpenChange(false);
      setSource("");
      setCount(8);
      setDifficulty("medium");
      pushToast({
        title: `${res.cards.length} cards generated`,
        description: "Added to this deck – ready to study.",
        variant: "success",
      });
    },
    onError: (e: unknown) => {
      const err = e as Error;
      pushToast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canGenerate = source.trim().length >= 10 && !generate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" /> Generate flashcards with AI
          </DialogTitle>
          <DialogDescription>
            Paste notes, a chapter excerpt, or anything you want to memorise. Study Flow turns it into question/answer pairs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Source material</Label>
            <Textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="The mitochondria is the site of oxidative phosphorylation…"
              className="min-h-[120px] resize-none text-sm"
              maxLength={12000}
            />
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              {source.length} / 12,000 characters
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">How many cards</Label>
              <span className="font-display text-sm font-semibold">{count}</span>
            </div>
            <Slider
              value={[count]}
              min={1}
              max={20}
              step={1}
              onValueChange={(v) => setCount(v[0])}
            />
          </div>

          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Difficulty</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                    difficulty === d
                      ? "border-brand/40 bg-brand/8 text-brand"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/15 hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generate.isPending}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            onClick={() => generate.mutate()}
            disabled={!canGenerate}
          >
            {generate.isPending ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate {count}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------ Study tab – SM-2 review flow ------------ */

function StudyTab({
  deckId,
  dueCount,
  totalCards,
}: {
  deckId: string;
  dueCount: number;
  totalCards: number;
}) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();

  const [card, setCard] = useState<Flashcard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ card: Flashcard | null; done?: boolean }>(
        `/api/decks/${deckId}/review`,
        { method: "POST", json: {} }
      );
      if (!res.card || res.done) {
        setCard(null);
        setDone(true);
      } else {
        setCard(res.card);
        setFlipped(false);
      }
    } catch (e) {
      const err = e as Error;
      pushToast({ title: "Couldn't load card", description: err.message, variant: "destructive" });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [deckId, pushToast]);

  // initial load + when deckId changes
  useEffect(() => {
    setReviewed(0);
    setDone(false);
    setCard(null);
    fetchNext();
  }, [deckId, fetchNext]);

  const rate = async (quality: 0 | 1 | 2 | 3) => {
    if (!card) return;
    try {
      await api(`/api/decks/${deckId}/review`, {
        method: "POST",
        json: { quality },
      });
      setReviewed((r) => r + 1);
      await fetchNext();
    } catch (e) {
      const err = e as Error;
      pushToast({ title: "Couldn't save rating", description: err.message, variant: "destructive" });
    }
  };

  // keyboard shortcuts 1-4
  useEffect(() => {
    if (!flipped || loading || done) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const q = (Number(e.key) - 1) as 0 | 1 | 2 | 3;
        rate(q);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, loading, done, card]);

  const restart = () => {
    setReviewed(0);
    setDone(false);
    setCard(null);
    fetchNext();
  };

  const backToList = () => {
    qc.invalidateQueries({ queryKey: ["/api/decks", deckId] });
    qc.invalidateQueries({ queryKey: ["/api/decks"] });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 h-3 w-32">
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="relative h-72 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="skeleton-shimmer absolute inset-0 bg-muted/30" />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-soft"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
            {reviewed > 0 ? "Session complete" : "Nothing due right now"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {reviewed > 0
              ? `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}. Come back when the schedule says so – your memory will thank you.`
              : "You're all caught up. Try another deck, or add new cards to this one."}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {reviewed > 0 && (
              <Button variant="outline" onClick={restart}>
                <RotateCw className="mr-1.5 h-4 w-4" /> Review again
              </Button>
            )}
            <Button onClick={backToList}>
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="mx-auto max-w-2xl">
      {/* progress */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Reviewed <span className="font-semibold text-foreground">{reviewed}</span> of{" "}
          <span className="font-semibold text-foreground">{dueCount || "–"}</span> due
        </span>
        <span className="inline-flex items-center gap-1">
          <LayersIcon className="h-3.5 w-3.5" /> {totalCards} total in deck
        </span>
      </div>

      {/* Flip card */}
      <div
        className="group [perspective:1200px]"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        aria-label={flipped ? "Show question" : "Reveal answer"}
      >
        <motion.div
          className="relative h-72 w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-soft [backface-visibility:hidden]">
            <p className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Question
            </p>
            <p className="font-display text-lg font-medium leading-relaxed">{card.front}</p>
            <p className="absolute bottom-4 text-[11px] text-muted-foreground/60">
              Click or press space to flip
            </p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-wider text-brand">
              Answer
            </p>
            <p className="font-display text-lg font-medium leading-relaxed">{card.back}</p>
          </div>
        </motion.div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 grid grid-cols-4 gap-2"
        >
          {RATINGS.map((r) => (
            <button
              key={r.key}
              onClick={(e) => {
                e.stopPropagation();
                rate(r.key);
              }}
              className={cn(
                "group/rating flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3 text-xs font-medium transition-all hover:scale-[1.02] hover:shadow-soft",
                r.border
              )}
            >
              <span className={cn("font-display text-base font-semibold", r.color)}>{r.label}</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                {r.hint}
              </kbd>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ------------ New deck dialog ------------ */

function NewDeckDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (vars: { name: string; description?: string; subjectId?: string }) => void;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const subjectsQuery = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      subjectId: subjectId || undefined,
    });
    setName("");
    setDescription("");
    setSubjectId("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setName("");
          setDescription("");
          setSubjectId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New deck</DialogTitle>
          <DialogDescription>
            Group flashcards by topic. You can add AI-generated cards after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Chemistry – Functional Groups"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line summary of what this deck covers."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>
          {subjectsQuery.data?.subjects?.length ? (
            <div>
              <Label className="mb-1.5 text-xs text-muted-foreground">Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsQuery.data.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || creating} className="gap-2">
            {creating ? <RotateCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create deck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export { FlashcardsPanel as default };
