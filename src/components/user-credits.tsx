import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";

export function UserCredits() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  // Get user information from Convex
  const userData = useQuery(api.users.getUserByToken, {
    userId: user?.id || "",
  });

  // If user is not signed in or data is loading, show a loading indicator
  if (!isSignedIn || userData === undefined) {
    return (
      <div className="flex items-center gap-1 text-sm text-[var(--color-neutral-600)]">
        <Loader2 className="h-3 w-3 animate-spin text-[var(--color-primary)]" />
        <span>Credits loading...</span>
      </div>
    );
  }

  // Display the number of credits or 0 if not set
  const credits = userData?.imageCredits ?? 0;

  return (
    <div className="text-sm font-medium">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => navigate({ to: "/credits" })}
        className="border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/5 text-[var(--color-neutral-800)] hover:cursor-pointer hover:text-[var(--color-primary)] rounded-xl"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="h-4 w-4 mr-1 text-[var(--color-accent)]" />
          <span className={`${credits === 0 ? 'text-red-500' : credits < 3 ? 'text-amber-500' : 'text-[var(--color-primary)]'}`}>
            {credits} {credits === 1 ? 'credit' : 'credits'} remaining
          </span>
        </span>
      </Button>
    </div>
  );
}
