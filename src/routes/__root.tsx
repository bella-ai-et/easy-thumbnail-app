import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { UserCredits } from '../components/user-credits'

export const Route = createRootRoute({
    component: () => (
        <>
            <header className="border-b border-[var(--color-neutral-200)] sticky top-0 z-[99] bg-white shadow-sm">
                <div className="flex px-6 h-16 items-center max-w-5xl mx-auto">
                    <Link to="/" className="flex items-center gap-2">
                        <img 
                            src="/logo.png" 
                            alt="PaperBag logo" 
                            loading="eager" 
                            fetchPriority="high" 
                            width={40} 
                            height={40} 
                            decoding="sync"
                            style={{ aspectRatio: '1/1' }}
                        />
                    </Link>
                    <nav className="ml-auto flex items-center justify-center space-x-4">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="text-[var(--color-neutral-800)] hover:cursor-pointer hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary-dark)]">Dashboard</Button>
                        </Link>
                        <SignedIn>
                            <div className="flex items-center gap-3">
                                <UserCredits />
                                <UserButton />
                            </div>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal" fallbackRedirectUrl="/">
                                <Button size="sm" variant="outline" className="border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] rounded-xl">Sign In</Button>
                            </SignInButton>
                        </SignedOut>
                    </nav>
                </div>
            </header>
            <Outlet />
            {/* Footer */}
            <footer className="border-t border-[var(--color-neutral-200)] py-8">
                <div className="container flex flex-col items-center justify-center gap-4 md:flex-row">
                    <p className="text-center text-xs text-[var(--color-neutral-600)]">
                        © 2025 PaperBag. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/" className="text-xs text-[var(--color-neutral-600)] hover:text-[var(--color-primary)]">Terms</Link>
                        <Link to="/" className="text-xs text-[var(--color-neutral-600)] hover:text-[var(--color-primary)]">Privacy</Link>
                        <Link to="/" className="text-xs text-[var(--color-neutral-600)] hover:text-[var(--color-primary)]">Contact</Link>
                    </div>
                </div>
            </footer>
        </>
    ),
})