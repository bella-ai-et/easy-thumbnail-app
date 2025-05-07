import { createFileRoute } from '@tanstack/react-router'
import { SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from '../components/ui/button'
import { Download, Upload } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  ssr: true,
})

function Dashboard() {
  const { isSignedIn, userId } = useAuth()

  // Fetch user's images from Convex
  const userImages = useQuery(
    api.files.getUserImages,
    isSignedIn && userId ? { userId } : "skip"
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-2xl font-semibold text-center mb-6">Access your gallery</h2>
            <p className="text-neutral-600 mb-4 text-center max-w-md">
              Sign in or create an account to access your cartoon image gallery.
            </p>
            <div className="flex gap-4">
              <SignInButton mode="modal">
                <Button variant="default">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline">
                  Create Account
                </Button>
              </SignUpButton>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-[#1D1D1F]">Your Gallery</h1>
              <p className="mt-2 text-neutral-600">
                View all your cartoon transformations in one place.
              </p>
            </div>

            {userImages && userImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {userImages.map((image) => (
                  <div key={image._id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col space-y-4">
                      <div className="aspect-square overflow-hidden rounded-lg">
                        <h3 className="font-medium mb-2 text-[#1D1D1F]">Original Photo</h3>
                        {image.originalImageUrl && (
                          <img 
                            src={image.originalImageUrl} 
                            alt="Original" 
                            className="h-full w-full object-cover rounded"
                          />
                        )}
                      </div>

                      <div className="aspect-square overflow-hidden rounded-lg">
                        <h3 className="font-medium mb-2 text-[#1D1D1F]">Cartoon Version</h3>
                        {image.cartoonImageUrl ? (
                          <img 
                            src={image.cartoonImageUrl} 
                            alt="Cartoon" 
                            className="h-full w-full object-cover rounded"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500">
                            {image.status === "pending" || image.status === "processing" 
                              ? "Processing..." 
                              : "Not available"}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex justify-between">
                        <span className="text-sm text-neutral-500">
                          {new Date(image.createdAt).toLocaleDateString()}
                        </span>
                        {image.cartoonImageUrl && (
                          <a
                            href={image.cartoonImageUrl}
                            download="cartoon-image.jpg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
                <Upload className="h-16 w-16 text-neutral-300 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No images found</h2>
                <p className="text-neutral-600 mb-6 text-center max-w-md">
                  You haven't created any cartoon transformations yet. Go to the home page to get started.
                </p>
                <Link to="/">
                  <Button>
                    Create Your First Cartoon
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}