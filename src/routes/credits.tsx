import { createFileRoute } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { Credits } from '../components/credits';

export const Route = createFileRoute('/credits')({
    component: CreditsPage,
    ssr: true,
})

function CreditsPage() {
    const getPlansAction = useAction(api.transactions.getPlansPolar);
    const [plans, setPlans] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const fetchPlans = async () => {
        setIsLoading(true);
        try {
          const plansData = await getPlansAction();
          setPlans(plansData);
        } catch (error) {
          console.error("Error fetching plans:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPlans();
    }, [getPlansAction]);
  
    return (
        <div className="px-4 py-12 sm:py-16 lg:py-20 bg-[var(--color-neutral-50)]  min-h-screen">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-2 mb-4">
                    <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-primary)]">Simple Pricing</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-neutral-900)] mb-4 font-heading">
                    Bag More Cartoon Credits
                </h1>
                <p className="text-xl text-[var(--color-neutral-600)] max-w-2xl mx-auto">
                    Transform your photos into your favourite cartoon style.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {isLoading ? (
                    <div className="col-span-2 flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
                    </div>
                ) : plans && plans.items && plans.items.length > 0 ? (
                    plans.items.flatMap((product: any) =>
                        (product.prices ?? [])
                            .filter((price: any) => price && price.id)
                            .map((price: any) => (
                                <Credits key={price.id} price={price} />
                            ))
                    )
                ) : (
                    <p className="col-span-2 text-center text-[var(--color-neutral-600)]">No plans available.</p>
                )}
            </div>

            <div className="mt-16 bg-white rounded-3xl p-8 max-w-4xl mx-auto card shadow-md border border-[var(--color-neutral-100)]">
                <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-4 font-heading">Why Choose PaperBag?</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-neutral-800)]">Cartoon Style</h3>
                        <p className="text-[var(--color-neutral-600)]">Our AI creates cartoon-style transformations with a distinctive style.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-neutral-800)]">Fast Processing</h3>
                        <p className="text-[var(--color-neutral-600)]">Get your cartoonized images in seconds, not minutes or hours like other services.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-neutral-800)]">Secure & Private</h3>
                        <p className="text-[var(--color-neutral-600)]">Your images are processed securely and never shared with third parties.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-neutral-800)]">No Frills</h3>
                        <p className="text-[var(--color-neutral-600)]">Simple pricing, straightforward service. Just what you need, nothing you don't.</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-sm text-[var(--color-neutral-600)]">
                    All plans include our core features. Upgrade anytime to access premium capabilities.
                    <br />
                    Questions? <a href="https://x.com/rasmickyy" target='_blank' className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:underline">Contact our support team</a>
                </p>
            </div>
        </div>
    );
}