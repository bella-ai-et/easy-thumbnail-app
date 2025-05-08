import { SignInButton, useAuth, useUser } from "@clerk/clerk-react"
import { useAction, useMutation, useQuery } from "convex/react"
import { Download, Sparkles, Upload } from "lucide-react"
import React, { DragEvent, useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { Credits } from "./credits"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "./ui/toast"

export default function CartoonHero() {
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()

  const [image, setImage] = useState<string | null>(null)
  const [cartoonImage, setCartoonImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageId, setImageId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cartoonStyle, setCartoonStyle] = useState<string>("simpsons")

  // Query to check if user has any processing images
  const userProcessingImages = useQuery(api.files.getUserProcessingImages, 
    isSignedIn && userId ? { userId } : "skip"
  )

  // Update processing state based on database
  useEffect(() => {
    if (userProcessingImages && userProcessingImages.length > 0) {
      // Get the first processing image∏
      const processingImage = userProcessingImages[0];
      
      // Set processing state
      setIsProcessing(true);
      setUploadError("You have an image being processed. Please wait for it to complete.");
      
      // Set the image ID so we can track its status
      if (processingImage.originalStorageId) {
        setImageId(processingImage.originalStorageId);
      }
      
      // Get and display the original image if available
      if (processingImage.originalImageUrl) {
        setImage(processingImage.originalImageUrl);
      }
    }
  }, [userProcessingImages])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const getPlansAction = useAction(api.transactions.getPlansPolar);
  const [plans, setPlans] = useState<any>(null);
  const { addToast } = useToast();
  
  // Available cartoon styles
  const cartoonStyles = [
    { id: "simpsons", name: "Simpsons" },
    { id: "studio-ghibli", name: "Studio Ghibli" },
    { id: "family-guy", name: "Family Guy" },
    { id: "disney", name: "Disney" },
    { id: "anime", name: "Anime" },
    { id: "comic-book", name: "Comic Book" },
    { id: "south-park", name: "South Park" }
  ]


  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansData = await getPlansAction();
        setPlans(plansData);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };
    fetchPlans();
  }, [getPlansAction]);


  // Convex mutations and queries
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const saveUploadedImage = useMutation(api.files.saveUploadedImage)
  const cartoonifyImage = useMutation(api.files.cartoonifyImage)
  const storeUser = useMutation(api.files.storeUser)
  
  // Get user's credit status
  const userCreditsStatus = useQuery(api.transactions.getUserCreditsStatus)

  // Get image details from the database
  const imageDetails = useQuery(
    api.files.getImageByStorageId,
    imageId ? { storageId: imageId } : "skip"
  )

  // Store user in Convex when they sign in
  useEffect(() => {
    const saveUser = async () => {
      if (isSignedIn && user) {
        await storeUser({
          name: user.fullName || user.username || "Anonymous",
          email: user.primaryEmailAddress?.emailAddress || "",
          clerkId: userId || "",
        })
      }
    }

    if (isSignedIn && user) {
      saveUser()
    }
  }, [isSignedIn, user, userId, storeUser])

  // Update cartoonImage when imageDetails changes
  useEffect(() => {
    if (imageDetails) {
      if (imageDetails.status === "completed" && imageDetails.cartoonImageUrl) {
        console.log("Setting cartoon image from database:", imageDetails.cartoonImageUrl);
        setCartoonImage(imageDetails.cartoonImageUrl);
        setIsProcessing(false);
        // Clear the imageId so it doesn't keep querying the database
        setImageId(null);
        // Keep the original image for comparison with the cartoon
      } else if (imageDetails.status === "processing" && imageDetails.cartoonImageUrl === "data:image/png;base64,PENDING_UPLOAD") {
        // This is a special marker that indicates the image is being processed
        // but the actual data is too large to store in the database
        console.log("Image is still being processed, waiting for completion...");
        setIsProcessing(true);
      } else if (imageDetails.status === "error") {
        console.error("Error processing image");
        setIsProcessing(false);
        setUploadError("There was an error processing your image. Please try again.");
        // Clear state on error
        setImageId(null);
      }
    }
  }, [imageDetails])
  
  // We don't need the handleUploadCartoonImage function anymore since we're not storing base64 data in the database

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check if user is authenticated
    if (!isSignedIn) {
      setUploadError("Please sign in to generate cartoon images")
      return
    }
    
    // Check if user has enough credits
    if (userCreditsStatus && userCreditsStatus.remainingCredits <= 0) {
      setUploadError("Please purchase more credits to continue.")
      return
    }

    setIsProcessing(true)
    setUploadError(null)

    try {
      // Display the image preview locally
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageData = event.target?.result as string
        setImage(imageData)
        setCartoonImage(null)
      }
      reader.readAsDataURL(file)

      // Upload to Convex
      const uploadUrl = await generateUploadUrl()

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      })

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`)
      }

      const { storageId } = await result.json()

      // Save image metadata
      if (userId) {
        await saveUploadedImage({
          storageId,
          userId,
        })

        setImageId(storageId)
        
        // Keep the uploaded image visible during processing
        
        // Show toast notification with dashboard button that stays open until closed
        addToast(
          <div className="space-y-2 ">
            <p>Your image is being processed.</p>
            <p>You can safely refresh or come back to it later in your dashboard.</p>
            <Button 
              className="mt-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:cursor-pointer text-white text-xs py-1 px-3"
              onClick={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </div>, 
          "info", 
          0 // 0 means it won't auto-close
        )
        
        // Automatically start cartoonifying the image
        await cartoonifyImage({ storageId, style: cartoonStyle })
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setUploadError("Failed to upload image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }



  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] ">
      <main className="w-full py-12 px-4">
        {/* Hero Section */}
        <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-14 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[var(--color-primary)]/10 px-4 py-2 mb-4 sm:mb-6">
            <span className="text-sm font-medium text-[var(--color-primary)]">
              Transform your photos instantly
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-neutral-900)] text-balance">
            Bag yourself a cartoon version in seconds.
          </h1>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-[var(--color-neutral-600)] max-w-lg mx-auto leading-relaxed">
            Minimalist cartoon transformations, powered by AI.
          </p>
        </div>

        {/* Image Transformation Section */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative rounded-xl shadow-sm border border-[var(--color-neutral-100)] overflow-hidden card">
            
            {/* Image transformation studio */}
            <div className="relative z-10 py-6">
              {/* Image headers */}
              <div className="flex justify-between mb-2 px-4 sm:px-8">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-2"></div>
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">Original Photo</span>
                </div>
                <div className="sm:hidden"></div> {/* Spacer for mobile */}
                <div className="items-center hidden sm:flex">
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">Cartoon Version</span>
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] ml-2"></div>
                </div>
              </div>
              
              {/* Main content area */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0">
                {/* Left side - Original image */}
                <div className="w-full sm:w-[42%]">
                  <div className="aspect-square overflow-hidden rounded-xl relative border border-neutral-100 bg-white">
                    {image ? (
                      <img src={image} alt="Original" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div 
                        className="flex h-full w-full flex-col items-center justify-center p-6 cursor-pointer"
                        onClick={() => {
                          // Check if already processing
                          if (isProcessing) {
                            setUploadError("Please wait for the current image to finish processing")
                            return
                          }

                          // Check if user is authenticated
                          if (!isSignedIn) {
                            setUploadError("Please sign in to generate cartoon images")
                            return
                          }
                          
                          // Check if user has enough credits
                          if (userCreditsStatus && userCreditsStatus.remainingCredits <= 0) {
                            setUploadError("Please purchase more credits to continue.")
                            return
                          }
                          
                          fileInputRef.current?.click()
                        }}
                        onDragOver={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragEnter={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.add('bg-[var(--color-primary)]/5');
                        }}
                        onDragLeave={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove('bg-[var(--color-primary)]/5');
                        }}
                        onDrop={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove('bg-[var(--color-primary)]/5');
                          
                          // Check if user is authenticated
                          if (!isSignedIn) {
                            setUploadError("Please sign in to generate cartoon images")
                            return
                          }
                          
                          // Check if user has enough credits
                          if (userCreditsStatus && userCreditsStatus.remainingCredits <= 0) {
                            setUploadError("Please purchase more credits to continue.")
                            return
                          }
                          
                          // Check if already processing
                          if (isProcessing) {
                            setUploadError("Please wait for the current image to finish processing")
                            return
                          }

                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            const file = files[0];
                            if (file.type.startsWith('image/')) {
                              // Create a new file input event
                              const dataTransfer = new DataTransfer();
                              dataTransfer.items.add(file);
                              
                              if (fileInputRef.current) {
                                fileInputRef.current.files = dataTransfer.files;
                                const event = new Event('change', { bubbles: true });
                                fileInputRef.current.dispatchEvent(event);
                                
                                // The toast will be handled in handleFileChange
                              }
                            }
                          }
                        }}
                      >
                        <div className="bg-[var(--color-primary)]/10 p-3 rounded-full mb-2">
                          <Upload className="h-6 w-6 text-[var(--color-primary)]" />
                        </div>
                        <p className="text-xs text-[var(--color-neutral-700)] font-medium hover:text-[var(--color-primary)]">Drop your photo</p>
                        <p className="text-xs text-[var(--color-neutral-500)] mt-1 max-w-[150px] text-center opacity-80">or click to upload</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Middle - Transformation arrow */}
                <div className="flex items-center justify-center mx-2 my-1 sm:my-0 transform sm:transform-none rotate-90 sm:rotate-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[var(--color-primary)] text-white shadow-md">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Mobile label for Cartoon Version */}
                <div className="flex items-center justify-center w-full sm:hidden mb-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-2"></div>
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">Cartoon Version</span>
                </div>

                {/* Right side - Cartoon result */}
                <div className="w-full sm:w-[42%]">
                  <div className="aspect-square overflow-hidden rounded-xl relative border border-neutral-100 bg-white">
                    {cartoonImage ? (
                      <img
                        src={cartoonImage}
                        alt="Cartoon"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4">
                        <div className="bg-[var(--color-accent)]/10 p-3 rounded-full mb-2">
                          <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
                        </div>
                        <p className="text-xs text-[var(--color-neutral-700)] font-medium">Cartoon result</p>
                        <p className="text-xs text-[var(--color-neutral-500)] mt-1 max-w-[150px] text-center opacity-80">Your slick cartoon will appear here</p>
                        {uploadError && (
                          <p className="mt-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{uploadError}</p>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 border-2 border-t-[var(--color-primary)] border-r-[var(--color-primary)]/20 border-b-[var(--color-primary)]/20 border-l-[var(--color-primary)]/20 rounded-full animate-spin"></div>
                          <p className="text-xs mt-2 font-medium text-[var(--color-neutral-800)] bg-white px-3 py-0.5 rounded-full shadow-sm">Processing</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Style selector and action buttons row */}
              <div className="mt-3 sm:mt-4 flex flex-col items-center space-y-3 px-2 sm:px-0">
                {/* Style selector */}
                <div className="w-full max-w-md px-2">
                  <label className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1 ml-1">Select Cartoon Style</label>
                  <Select
                    value={cartoonStyle}
                    onValueChange={(value) => setCartoonStyle(value)}
                  >
                    <SelectTrigger className="w-full h-11 rounded-lg border-[var(--color-neutral-200)] hover:border-[var(--color-primary)] hover:cursor-pointer transition-colors">
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoonStyles.map((style) => (
                        <SelectItem key={style.id} value={style.id} className="cursor-pointer">
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 w-full max-w-md px-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
    


                  {cartoonImage && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 text-sm sm:text-md font-medium rounded-lg border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => {
                          // Download the image - we need to force the correct content type
                          const link = document.createElement('a');
                          link.href = cartoonImage || '';
                          link.download = 'cartoon.png';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="mr-1.5 h-5 w-5" /> Download
                      </Button>
                      
                      <Button
                        variant="default"
                        className="flex-1 h-12 text-sm sm:text-md font-medium rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 mt-2 sm:mt-0"
                        onClick={() => {
                          // Clear all states to start fresh
                          setImage(null);
                          setCartoonImage(null);
                          setImageId(null);
                          setUploadError(null);
                        }}
                      >
                        Create New
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Style preview indicator */}
          <div className="mt-4 sm:mt-6 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-neutral-700)] bg-[var(--color-neutral-100)] px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
              Selected style: {cartoonStyles.find(style => style.id === cartoonStyle)?.name}
            </span>
          </div>
          
          {!isSignedIn && (
            <div className="mt-5 sm:mt-8 text-center bg-white rounded-2xl p-4 sm:p-6 shadow-md max-w-md mx-auto border border-[var(--color-neutral-100)] card">
              <div className="mb-3 mx-auto w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[var(--color-neutral-800)] mb-2">Bag yourself an account</h3>
              <p className="text-sm text-[var(--color-neutral-600)] mb-4">Create an account to access all premium features</p>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <Button
                  className="h-12 px-6 text-sm font-medium rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 w-full"
                >
                  Sign In
                </Button>
              </SignInButton>
            </div>
          )}
        </div>

        {/* Before and After Showcase Section */}
        <div className="text-center mx-auto max-w-2xl mb-8 sm:mb-12 mt-12 sm:mt-16 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[var(--color-primary)]/10 px-4 py-2 mb-4 sm:mb-6">
            <span className="text-sm font-medium text-[var(--color-primary)]">
              Transformation Examples
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-neutral-900)] text-balance">
            Before & After Showcases
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--color-neutral-600)] max-w-lg mx-auto leading-relaxed">
            See how our AI transforms regular photos into stunning cartoon styles.
          </p>
        </div>

        {/* Showcase Gallery */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Example 1: Simpsons Style */}
            <div className="bg-white rounded-xl overflow-hidden shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border border-[var(--color-neutral-100)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="grid grid-cols-2 h-full">
                  <div className="relative">
                    <img 
                      src="https://blessed-kudu-154.convex.cloud/api/storage/29584e0a-d68e-427b-9fa8-db983c4d9a02" 
                      alt="Original portrait" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                      Original
                    </div>
                  </div>
                  <div className="relative bg-[#FFF6D6]">
                    <img 
                      src="https://blessed-kudu-154.convex.cloud/api/storage/3a464c27-627c-4eb0-b6aa-99e71070a023" 
                      alt="Simpsons style" 
                      className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
                    />
                    <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white text-xs font-medium px-2 py-1 rounded">
                      Family Guy
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[var(--color-neutral-800)]">
                  Family Guy Style
                </h3>
                <p className="text-xs text-[var(--color-neutral-600)] mt-1">
                  Iconic and distinctive Family Guy art style
                </p>
              </div>
            </div>

            {/* Example 2: Anime Style */}
            <div className="bg-white rounded-xl overflow-hidden shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border border-[var(--color-neutral-100)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="grid grid-cols-2 h-full">
                  <div className="relative">
                    <img 
                      src="https://blessed-kudu-154.convex.cloud/api/storage/37f27d22-9f24-470b-a568-620d16792393" 
                      alt="Original portrait" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                      Original
                    </div>
                  </div>
                  <div className="relative bg-[#F8F9FF]">
                    <img 
                      src="https://blessed-kudu-154.convex.cloud/api/storage/2554ac09-b5b6-4a2e-a2a9-0e38bf6818d5" 
                      alt="Simpsons style" 
                      className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
                    />
                    <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white text-xs font-medium px-2 py-1 rounded">
                      Simpsons
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[var(--color-neutral-800)]">
                  Simpsons Style
                </h3>
                <p className="text-xs text-[var(--color-neutral-600)] mt-1">
                  Iconic and distinctive Simpsons art style
                </p>
              </div>
            </div>


          </div>
        </div>

        {/* Pricing Section */}
        <div className="text-center mx-auto max-w-2xl mb-8 sm:mb-12 mt-12 sm:mt-16 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[var(--color-primary)]/10 px-4 py-2 mb-4 sm:mb-6">
            <span className="text-sm font-medium text-[var(--color-primary)]">
              Choose Your Plan
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-neutral-900)] text-balance">
            No Frills. Just Cartoons.
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--color-neutral-600)] max-w-lg mx-auto leading-relaxed">
            Get unlimited access to our AI cartoon transformation technology with our simple pricing options.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto px-4 sm:px-6">
          {plans?.items?.map((product: any) => (
            product.prices.map((price: any) => (
              <Credits
                key={price.id}
                price={price}
              />
            ))
          ))}
        </div>
      </main>
    </div>
  )
}

