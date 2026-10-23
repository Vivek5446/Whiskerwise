import idle from "@/assets/kitten-idle.png";
import thinking from "@/assets/kitten-thinking.png";
import incorrect from "@/assets/kitten-incorrect.png";
import hint from "@/assets/kitten-hint.png";
import victory from "@/assets/mascot-cheer.png";
import { cn } from "@/lib/utils";

const POSES = { idle, thinking, incorrect, hint, victory };
export type KittenMood = keyof typeof POSES;

export function Kitten({ mood = "idle", className, react = false }: { mood?: KittenMood; className?: string; react?: boolean }) {
  return <img key={mood} src={POSES[mood]} alt="" width={512} height={512} draggable={false} className={cn("aspect-square shrink-0 object-contain", react && "animate-kitten", className)} />;
}