import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Lightbulb, X } from "lucide-react";
import { useState } from "react";
import { CatIcon } from "./CatIcon";
import { Kitten, type KittenMood } from "./Kitten";
import { GameButton } from "./ui";
import { cn } from "@/lib/utils";

const STEPS: { title: string; text: string; mood: KittenMood }[] = [
  { title: "A little note", text: "Tap once to mark ✕. Tap again to clear your note.", mood: "idle" },
  { title: "A home for a cat", text: "Double tap to place a cat. One cat per row, column and color; cats cannot touch.", mood: "thinking" },
  { title: "Not every spot fits", text: "A wrong cat counts as one mistake. Tap to mark it, double tap to remove it, or Undo.", mood: "incorrect" },
  { title: "A little nudge", text: "Hint reveals a correct cat, or clears a wrong one first. Hints and mistakes affect your stars.", mood: "hint" },
];

export function Tutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  if (!current) return null;
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onComplete(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/45 animate-overlay" />
        <Dialog.Content aria-describedby="tutorial-description" className="fixed left-1/2 top-1/2 z-[61] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[2rem] border-4 border-card bg-background p-5 text-center shadow-soft">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-muted-foreground">{step + 1} / {STEPS.length}</span>
            <Dialog.Close asChild><GameButton variant="cell" tone="plain" aria-label="Close tutorial" className="grid size-11 place-items-center rounded-full"><X className="size-5" /></GameButton></Dialog.Close>
          </div>
          <div className="relative mx-auto my-1 flex h-36 w-full items-center justify-center gap-5" aria-hidden>
            <Kitten mood={current.mood} className="size-32" react />
            <div className={cn("relative grid size-20 shrink-0 place-items-center rounded-xl border-2 border-board bg-region-0", step === 2 && "bg-region-1", step === 3 && "bg-region-3")}>
              {step === 0 ? <X className="size-9 text-ink/55 animate-mark" strokeWidth={3} /> : <CatIcon key={step} mood={step === 2 ? "upset" : "happy"} className={cn("size-14", step === 2 ? "animate-shake" : "animate-pop")} />}
              {step === 1 && <span className="absolute -bottom-3 flex gap-1"><span className="size-3 rounded-full bg-primary" /><span className="size-3 rounded-full bg-primary" /></span>}
              {step === 3 && <Lightbulb className="absolute -right-2 -top-3 size-7 fill-star text-star-deep" />}
            </div>
          </div>
          <Dialog.Title className="mt-2 text-2xl font-bold">{current.title}</Dialog.Title>
          <Dialog.Description id="tutorial-description" className="mt-2 min-h-20 text-sm font-semibold leading-relaxed text-muted-foreground">{current.text}</Dialog.Description>
          <p className="mb-4 text-xs text-muted-foreground">Keyboard: Enter places a cat · Space marks ✕</p>
          <div className="flex gap-3">
            {step > 0 && <GameButton tone="plain" onClick={() => setStep((s) => s - 1)} aria-label="Previous tip" className="grid size-12 shrink-0 place-items-center p-0"><ArrowLeft className="size-5" /></GameButton>}
            <GameButton className="flex flex-1 items-center justify-center gap-2 text-base" onClick={() => step === STEPS.length - 1 ? onComplete() : setStep((s) => s + 1)}>{step === STEPS.length - 1 ? "Let's play" : "Next"}<ArrowRight className="size-4" /></GameButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}