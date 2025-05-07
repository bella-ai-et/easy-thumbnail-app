import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

import OpenAI from "openai";

export const ImageGen = internalAction({
    args: {
        imageUrl: v.string(),
        userId: v.string(),
        style: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"images"> | ConvexError<string>> => {
        console.log(`[ImageGen] Image URL: ${args.imageUrl}`);

        if (!process.env.OPENAI_API_KEY) {
            throw new ConvexError("API key not configured");
        }

        // Find the image record to update status in case of error
        const imageRecord = await ctx.runQuery(internal.image.getImageByUrl, {
            imageUrl: args.imageUrl
        });

        try {
            // Initialize OpenAI with API key
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            // Create the prompt for the specific style transformation
            const prompt = `You are a world-class professional artist specializing in ${args.style} transformations.
                
            Your task is to transform the input photograph into a high-quality ${args.style} artwork with these specific requirements:
                    
            1. MOST IMPORTANT: Maintain accurate facial likeness - the result MUST look like the exact same person in the photo
            2. CRITICAL: Preserve the person's racial characteristics and identity without alteration
            3. Accurately capture distinctive features including: face shape, hairstyle, eyebrows, nose structure, mouth/smile, and facial expression
            4. Match the person's actual skin tone appropriately
            5. Include the same clothing/accessories as in the original image
            6. Keep the background theme consistent with the original
            7. Use the characteristic ${args.style} aesthetic while preserving the person's identity
            8. Create a polished, professional result that is instantly recognizable as the same person`;

            // Fetch the image data
            const imageResponse = await fetch(args.imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();

            // Convert to File object with proper metadata that OpenAI expects
            const file = new File(
                [new Uint8Array(imageBuffer)],
                "image.png",
                { type: "image/png" }
            );

            // Call OpenAI's image generation API with the source image
            const response = await openai.images.edit({
                model: "gpt-image-1",
                image: [file],  // Pass an array containing the File object
                prompt: prompt,
            });

            // Get the base64 image data from response
            const imageData = response.data?.[0].b64_json;
            if (!imageData) {
                if (imageRecord) {
                    await ctx.runMutation(internal.image.updateImageStatus, {
                        imageId: imageRecord._id,
                        status: "error",
                        errorMessage: "No image data found in response"
                    });
                }
                return new ConvexError("No image data found in response");
            }

            // Format the image data with proper data URL prefix
            const processedImageData = `data:image/png;base64,${imageData}`;

            // Call a mutation to store the image in the database
            const imageId: Id<"images"> = await ctx.runMutation(internal.image.storeCartoonImage, {
                userId: args.userId,
                originalStorageId: args.imageUrl,
                originalImageUrl: args.imageUrl,
                cartoonImageData: processedImageData,
            });

            return imageId;

        } catch (error: any) {
            console.error("[ImageGen] Error generating content:", error);
            console.error("[ImageGen] Error details:", error?.message || "Unknown error");
            console.error("[ImageGen] Error stack:", error?.stack || "No stack trace");
            console.error("[ImageGen] Failed to generate or store image after all processing");

            // Update status to error if we have an image record
            if (imageRecord) {
                await ctx.runMutation(internal.image.updateImageStatus, {
                    imageId: imageRecord._id,
                    status: "error",
                    errorMessage: error?.message || "Failed to generate image"
                });
            }
            return new ConvexError("Failed to generate image");
        }
    }
});

// Helper query to get image by ID
export const getImageById = internalQuery({
    args: {
        imageId: v.id("images"),
    },
    handler: async (ctx, args) => {
        const image = await ctx.db.get(args.imageId);
        return image;
    }
});

// Helper query to get image by URL
export const getImageByUrl = internalQuery({
    args: {
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const images = await ctx.db
            .query("images")
            .filter(q => q.eq(q.field("originalImageUrl"), args.imageUrl))
            .collect();

        return images[0] || null;
    },
});

// Helper mutation to update image status
export const updateImageStatus = internalMutation({
    args: {
        imageId: v.id("images"),
        status: v.string(),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {

        // Only update status and timestamp, as errorMessage is not in the schema
        const updateData = {
            status: args.status,
            updatedAt: Date.now(),
        };

        // Log the error message but don't store it
        if (args.errorMessage) {
            console.error(`[updateImageStatus] Error for image ${args.imageId}: ${args.errorMessage}`);
        }

        await ctx.db.patch(args.imageId, updateData);

        return { success: true };
    },
});

export const directlyUploadImage = internalAction({
    args: {
        imageId: v.id("images"),
        base64Data: v.string(),
        uploadUrl: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {

        try {
            // Create form data for upload
            // In Convex actions, we need to use raw fetch requests

            // Convert base64 to binary data - First ensure it's clean base64
            let base64 = args.base64Data;

            // If it's a data URL, extract just the base64 part
            if (base64.startsWith('data:')) {
                const parts = base64.split(',');
                if (parts.length > 1) {
                    base64 = parts[1];
                }
            }

            // Use a more reliable base64 to binary conversion
            // This is critical to ensure proper encoding of the image data

            // Create a binary string from the base64
            let binaryString = '';
            try {
                binaryString = atob(base64);
            } catch (e) {
                console.error("[directlyUploadImage] Error decoding base64:", e);
                throw new Error("Invalid base64 data");
            }

            // Convert the binary string to a Uint8Array for the blob
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Verify the data looks valid (check for PNG signature)
            if (bytes.length > 8) {
                const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]; // PNG file signature
                let isPNG = true;
                for (let i = 0; i < 8; i++) {
                    if (bytes[i] !== pngSignature[i]) {
                        isPNG = false;
                        break;
                    }
                }
                if (isPNG) {
                    console.log(`[directlyUploadImage] Data appears to be a valid PNG image`);
                } else {
                    console.log(`[directlyUploadImage] Warning: Data does not have PNG signature, might not be a valid image`);
                }
            }

            // Check the first few bytes to determine the file type correctly
            // This is crucial for ensuring the image displays properly
            let contentType = 'image/png'; // default

            if (bytes.length > 4) {
                // Check for PNG signature (89 50 4E 47) - decimal: 137, 80, 78, 71
                if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
                    contentType = 'image/png';
                    console.log(`[directlyUploadImage] Detected PNG signature in first bytes`);
                }
                // Check for JPEG/JFIF signature (FF D8 FF)
                else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
                    contentType = 'image/jpeg';
                    console.log(`[directlyUploadImage] Detected JPEG signature in first bytes`);
                }
                // SVG is text-based, so check for typical SVG patterns
                else if (binaryString.includes('<svg') || binaryString.includes('<?xml')) {
                    contentType = 'image/svg+xml';
                    console.log(`[directlyUploadImage] Detected SVG in text content`);
                }
                // Display the first few bytes for debugging
                const firstBytes = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                console.log(`[directlyUploadImage] First 8 bytes: ${firstBytes}`);
            }

            // Create a blob with the detected content type
            const blob = new Blob([bytes], { type: contentType });

            // Create a unique name for the file to avoid caching issues
            const fileExt = contentType === 'image/svg+xml' ? 'svg' :
                contentType === 'image/jpeg' ? 'jpg' : 'png';
            const uniqueFileName = `cartoon_${Date.now()}.${fileExt}`;

            // Set specific headers for proper image handling
            const response = await fetch(args.uploadUrl, {
                method: 'POST',
                // Send the binary data directly
                body: blob,
                headers: {
                    // Explicitly set the Content-Type to the image type
                    'Content-Type': contentType,
                    // Tell Convex this is the intended content type
                    'X-Content-Type': contentType,
                    // Set filename and force inline display (not download)
                    'X-Content-Disposition': `inline; filename="${uniqueFileName}"`,
                    // Custom header that might help
                    'X-File-Name': uniqueFileName
                }
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            // Get the storage ID from the response
            const result = await response.json();
            const storageId = result.storageId;

            // Instead of getting the URL, we'll store directly
            // We'll get the URL inside updateCartoonImageWithStorageId

            // Update the image record with the storage ID and URL
            // We need to update the record directly since updateImageStatus doesn't accept storageId
            await ctx.runMutation(internal.image.updateCartoonImageWithStorageId, {
                imageId: args.imageId,
                storageId: storageId
            });

            // Also update the status to completed
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: args.imageId,
                status: "completed"
            });
        } catch (error) {
            // Update image status to error
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: args.imageId,
                status: "error",
                errorMessage: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
});

export const uploadCartoonImage = internalAction({
    args: {
        imageId: v.id("images"),
        base64Data: v.string(),
        uploadUrl: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        try {
            // Instead of trying to convert the base64 in the action, 
            // let's simply store a flag in the database and let the client 
            // handle the actual upload

            // Get the image data from the database
            const image = await ctx.runQuery(internal.image.getImageById, {
                imageId: args.imageId
            });

            if (!image) {
                throw new Error(`Image with ID ${args.imageId} not found`);
            }

            // Update the image record to indicate it needs client-side processing
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: args.imageId,
                status: "needs_client_upload",
                errorMessage: "Image requires client-side upload"
            });
        } catch (error) {

            // Update the image status to error
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: args.imageId,
                status: "error",
                errorMessage: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
});

// Fix for currently stuck image (one-time use function)
export const fixStuckImage = mutation({
    args: {
        imageIdString: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
        try {
            // Convert string ID to a proper Id type
            const imageId = args.imageIdString as Id<"images">;

            // Find the image
            const image = await ctx.db.get(imageId);
            if (!image) {
                console.log(`[fixStuckImage] Image ${imageId} not found`);
                return { success: false, message: "Image not found" };
            }

            // Update the image status to completed
            await ctx.db.patch(imageId, {
                status: "completed",
                updatedAt: Date.now(),
            });

            console.log(`[fixStuckImage] Image ${imageId} status updated to completed`);
            return { success: true, message: "Image status updated to completed" };
        } catch (error) {
            console.error(`[fixStuckImage] Error:`, error);
            return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
        }
    },
});

// Update cartoon image with storage ID
export const updateCartoonImageWithStorageId = internalMutation({
    args: {
        imageId: v.id("images"),
        storageId: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        console.log(`[updateCartoonImageWithStorageId] Updating image ${args.imageId} with storage ID ${args.storageId}`);

        // Get the storage ID
        const storageId = args.storageId;

        // Get the URL for the stored image with proper content type header
        try {
            // Instead of adding headers to the storage URL, we need to ensure they were set correctly
            // during upload in directlyUploadImage
            console.log(`[updateCartoonImageWithStorageId] Getting URL for storage ID: ${storageId}`);
            const cartoonImageUrl = await ctx.storage.getUrl(storageId) || '';

            // Log the URL for debugging
            console.log(`[updateCartoonImageWithStorageId] Image URL: ${cartoonImageUrl}`);

            // Update the image record with the storage ID and URL
            await ctx.db.patch(args.imageId, {
                cartoonStorageId: storageId,
                cartoonImageUrl: cartoonImageUrl,
                status: "completed",
                updatedAt: Date.now(),
            });

            console.log(`[updateCartoonImageWithStorageId] Image successfully updated with URL: ${cartoonImageUrl}`);

            // Deduct one image credit from the user's account
            // Get the image to find the user
            const image = await ctx.db.get(args.imageId);
            if (image && image.userId) {
                try {
                    // Deduct a credit using auth identity from the image
                    // Get the user record
                    const users = await ctx.db
                        .query("users")
                        .withIndex("by_user_id", (q) =>
                            q.eq("userId", image.userId)
                        )
                        .collect();

                    const user = users[0];
                    if (user) {
                        // Use a type assertion to access imageCredits
                        const userWithCredits = user as unknown as { imageCredits?: number };
                        // Default to 0 if not defined yet
                        const currentCredits = userWithCredits.imageCredits || 0;

                        // Only deduct if they have credits
                        if (currentCredits > 0) {
                            await ctx.db.patch(user._id, {
                                imageCredits: currentCredits - 1
                            } as any); // Using type assertion to bypass TypeScript checking

                            console.log(`[updateCartoonImageWithStorageId] Deducted 1 credit from user ${image.userId}, remaining: ${currentCredits - 1}`);
                        } else {
                            console.log(`[updateCartoonImageWithStorageId] User ${image.userId} has no credits to deduct`);
                        }
                    }
                } catch (error) {
                    console.error(`[updateCartoonImageWithStorageId] Error deducting credit:`, error);
                    // Don't fail the image update if credit deduction fails
                }
            }

            // Return the URL so we can use it in the client
            return cartoonImageUrl;
        } catch (error) {
            console.error(`[updateCartoonImageWithStorageId] Error updating image:`, error);
            await ctx.db.patch(args.imageId, {
                status: "error",
                updatedAt: Date.now(),
            });
            throw new Error(`Failed to update image with storage ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

export const storeCartoonImage = internalMutation({
    args: {
        userId: v.string(),
        originalStorageId: v.string(),
        originalImageUrl: v.string(),
        cartoonImageData: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"images">> => {
        console.log("[storeCartoonImage] Processing cartoon image");

        // Find existing image record by originalImageUrl
        const existingImages = await ctx.db
            .query("images")
            .filter(q => q.eq(q.field("originalImageUrl"), args.originalImageUrl))
            .collect();

        const existingImage = existingImages[0];

        try {
            // Make sure the data has the proper prefix for base64 processing
            let imageData = args.cartoonImageData;
            if (imageData.startsWith('data:')) {
                // Extract the base64 part from the data URL
                const base64Data = imageData.split(',')[1];
                if (base64Data) {
                    imageData = base64Data;
                }
            }

            console.log(`[storeCartoonImage] Processing image data of length: ${imageData.length} characters`);

            // Create or get the image record first
            const tempImageId = existingImage ? existingImage._id : await ctx.db.insert("images", {
                userId: args.userId,
                originalStorageId: args.originalStorageId,
                originalImageUrl: args.originalImageUrl,
                status: "processing", // Set to processing until storage upload completes
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Convert base64 to blob for storage
            let base64Data = imageData;
            if (base64Data.startsWith('data:')) {
                // Extract the base64 part from the data URL
                const parts = base64Data.split(',');
                if (parts.length > 1) {
                    base64Data = parts[1];
                }
            }

            // Decode base64 data if it's a data URL
            if (imageData.startsWith('data:')) {
                const parts = imageData.split(',');
                if (parts.length > 1) {
                    imageData = parts[1];
                }
            }

            try {
                // First, generate a URL for uploading
                const uploadUrl = await ctx.storage.generateUploadUrl();
                console.log(`[storeCartoonImage] Generated upload URL: ${uploadUrl}`);

                // We'll update the image record with status completed once uploaded
                await ctx.db.patch(tempImageId, {
                    cartoonStorageId: uploadUrl, // Temporarily store the upload URL
                    // Set a temporary data URL to indicate image is being processed
                    cartoonImageUrl: "data:image/png;base64,PROCESSING",
                    status: "processing",
                    updatedAt: Date.now(),
                });

                console.log(`[storeCartoonImage] Image record updated with upload URL, ID: ${tempImageId}`);

                // Schedule the upload process
                // We'll upload the image in a separate action
                await ctx.scheduler.runAfter(0, internal.image.directlyUploadImage, {
                    imageId: tempImageId,
                    uploadUrl: uploadUrl,
                    base64Data: imageData
                });
            } catch (error) {
                console.error("[storeCartoonImage] Error preparing upload:", error);
                await ctx.db.patch(tempImageId, {
                    status: "error",
                    updatedAt: Date.now(),
                });
            }

            console.log(`[storeCartoonImage] Image successfully stored with base64 data, ID: ${tempImageId}`);
            return tempImageId;
        } catch (error) {
            console.error("[storeCartoonImage] Error:", error);

            // If there's an error, update the status to error
            console.log("[storeCartoonImage] Setting status to error due to processing failure");

            if (existingImage) {
                // Update existing record with error status
                await ctx.db.patch(existingImage._id, {
                    status: "error", // Mark as error instead of completed
                    updatedAt: Date.now(),
                });
                console.log(`[storeCartoonImage] Existing image updated with error status, ID: ${existingImage._id}`);
                return existingImage._id;
            } else {
                // Create new record with error status
                const imageId = await ctx.db.insert("images", {
                    userId: args.userId,
                    originalStorageId: args.originalStorageId,
                    originalImageUrl: args.originalImageUrl,
                    status: "error",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                console.log(`[storeCartoonImage] New image created with error status, ID: ${imageId}`);
                return imageId;
            }
        }
    }
});