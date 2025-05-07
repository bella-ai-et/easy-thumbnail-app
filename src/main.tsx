import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import './styles/brand.css'
import './styles/animations.css'
import { ToastProvider } from './components/ui/toast'
import { Analytics } from '@vercel/analytics/react';

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}


const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ToastProvider>
            <RouterProvider router={router} />
            <Analytics />
          </ToastProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  )
}