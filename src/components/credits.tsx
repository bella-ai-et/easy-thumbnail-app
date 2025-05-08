import { SignInButton, useUser } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useAction } from "convex/react";
import { CheckCircle } from "lucide-react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";

export function Credits({ price }: any) {
  // If price is undefined or missing id, do not render
  if (!price?.id) return null;
  const priceId = price.id;
  const { isLoaded } = useUser();
  const getImageCheckoutUrl = useAction(api.transactions.getImagePackCheckoutUrl);

  const handleCheckout = useCallback(async () => {
    try {
      const checkoutUrl = await getImageCheckoutUrl({ priceId });
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
    }
  }, [getImageCheckoutUrl, priceId]);

  return (
    <div className="group border relative rounded-[32px] bg-white p-8 transition-all hover:scale-[1.01] hover:shadow-lg ">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-[var(--color-neutral-50)]  rounded-[32px] -z-10" />

      <div className="inline-flex items-center gap-2 rounded-[20px] bg-[var(--color-primary)]/10 px-4 py-2 mb-6">
        <span className="text-sm font-medium text-[var(--color-primary)]">
          One-time Purchase
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2 font-heading">
            10 Image Generations
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-medium text-[var(--color-primary)]">
              ${(price.amount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-base text-[var(--color-neutral-600)] leading-relaxed">
          One-time payment for 10 cartoon image transformations
        </p>

        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="text-base text-[var(--color-neutral-800)]">
              10 high-quality cartoon transformations
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="text-base text-[var(--color-neutral-800)]">
              Download in full resolution
            </span>
          </li>
        </ul>

        {isLoaded && (
          <Authenticated>
            <Button
              className="w-full h-12 text-base rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              onClick={handleCheckout}
            >
              Bag these credits
            </Button>
          </Authenticated>
        )}
        <Unauthenticated>
          <SignInButton mode="modal" signUpFallbackRedirectUrl="/">
            <Button className="w-full h-12 text-base rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              Bag these credits
            </Button>
          </SignInButton>
        </Unauthenticated>
      </div>
    </div>
  );
}