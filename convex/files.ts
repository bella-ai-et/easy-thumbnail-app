import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// Generate a signed upload URL
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Generate a signed URL for uploading
    return await ctx.storage.generateUploadUrl();
  },
});

// Save the uploaded image information
export const saveUploadedImage = mutation({
  args: {
    storageId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // We don't need to check if the file exists
    // The file was just uploaded so it should exist

    // Generate a URL for the uploaded file
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    // Create a new image record with the URL
    const imageId = await ctx.db.insert("images", {
      userId: args.userId,
      originalStorageId: args.storageId,
      originalImageUrl: imageUrl || undefined, // Handle the case where URL could be null
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return imageId;
  },
});

// Get a URL to download an uploaded file with proper content type
export const getImageUrl = query({
  args: { 
    storageId: v.string(),
    contentType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    console.log(`[getImageUrl] Getting URL for storage ID: ${args.storageId}`);
    
    try {
      // Try to determine content type from the storageId or provided parameter
      let imageContentType = args.contentType || 'image/png';
      
      // Check the storage ID for file extension clues
      const storageId = args.storageId;
      if (storageId.includes('.jpg') || storageId.includes('.jpeg')) {
        imageContentType = 'image/jpeg';
      } else if (storageId.includes('.svg')) {
        imageContentType = 'image/svg+xml';
      } else if (storageId.includes('.png')) {
        imageContentType = 'image/png';
      }
      
      console.log(`[getImageUrl] Using content type: ${imageContentType}`);
      
      // Get URL from storage
      // Unfortunately, Convex storage.getUrl() doesn't accept content type parameters
      // But we're logging this information for debugging purposes
      const url = await ctx.storage.getUrl(args.storageId);
      
      if (!url) {
        console.log(`[getImageUrl] Failed to get URL for storage ID: ${args.storageId}`);
        return null;
      }
      
      console.log(`[getImageUrl] Generated URL: ${url}`);
      return url;
    } catch (error) {
      console.error(`[getImageUrl] Error getting URL:`, error);
      return null;
    }
  },
});

// Get all images for a user
export const getUserImages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return images;
  },
});

// Get a specific image by ID
export const getImageById = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }
    return image;
  },
});

// Get image by storage ID
export const getImageByStorageId = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.storageId))
      .collect();

    return images[0] || null;
  },
});

/* DEPRECATED: Cartoon-specific mutations start */
/* export const cartoonifyImage = mutation({
  args: { storageId: v.string(), style: v.string() },
  handler: async (ctx, args) => {
    // Find the image record by storage ID
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.storageId))
      .collect();

    const image = images[0];
    if (!image) {
      throw new ConvexError("Image record not found");
    }

    // Check if image is already being processed or completed
    if (image.status === "processing") {
      console.log(`[cartoonifyImage] Image ${image._id} is already being processed, skipping`);
      return { success: true, status: "processing" };
    }

    if (image.status === "completed" && image.cartoonImageUrl) {
      console.log(`[cartoonifyImage] Image ${image._id} is already completed, skipping`);
      return { success: true, status: "completed" };
    }

    // Update status to processing
    await ctx.db.patch(image._id, {
      status: "processing",
      updatedAt: Date.now(),
      type: "cartoon",
    });
    
    try {
      // Schedule the image generation task
      await ctx.scheduler.runAfter(0, internal.image.ImageGen, {
        imageUrl: image.originalImageUrl!,
        userId: image.userId,
        style: args.style,
        // preserve type for job
      });
      
      // The ImageGen action will update the image record when it completes
      return { success: true, status: "processing" };
    } catch (error) {
      console.error("[cartoonifyImage] Error scheduling ImageGen action:", error);
      
      // If scheduling fails, revert status to pending
      await ctx.db.patch(image._id, {
        status: "pending",
        updatedAt: Date.now()
        // Note: We can't store the error message since there's no field for it in the schema
      });
      
      throw new ConvexError("Failed to schedule image generation");
    }
  },
}); */

/* export const uploadCartoonImage = mutation({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the image record
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }

    // Verify the user owns this image
    if (image.userId !== identity.subject) {
      throw new ConvexError("Not authorized to upload this image");
    }

    // Generate a signed upload URL for the client
    const uploadUrl = await ctx.storage.generateUploadUrl();

    console.log('[uploadCartoonImage] Generated upload URL: ' + uploadUrl);
    return {
      uploadUrl,
      imageId: args.imageId,
      // Return the base64 data that was temporarily stored in cartoonStorageId
      // The client will use this to upload the image
      base64Data: image.cartoonStorageId,
    };
  },
}); */

/* export const updateCartoonImageStorage = mutation({
  args: {
    imageId: v.id("images"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the image record
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }

    // Verify the user owns this image
    if (image.userId !== identity.subject) {
      throw new ConvexError("Not authorized to update this image");
    }

    // Get the URL for the stored image
    const cartoonImageUrl = await ctx.storage.getUrl(args.storageId);
    if (!cartoonImageUrl) {
      throw new ConvexError("Failed to get URL for uploaded image");
    }
    
    // We'll handle proper image display via Content-Type on the client side

    // Update the image record with the storage ID and URL
    await ctx.db.patch(args.imageId, {
      cartoonStorageId: args.storageId,
      cartoonImageUrl: cartoonImageUrl,
    });

    return cartoonImageUrl;
  },
}); */
/* DEPRECATED: Cartoon-specific mutations end */

// Upload a base64 image to storage and get a clickable URL
export const uploadBase64Image = mutation({
  args: {
    imageId: v.id("images"),
    base64Data: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the image record
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }

    // Verify the user owns this image
    if (image.userId !== identity.subject) {
      throw new ConvexError("Not authorized to update this image");
    }

    try {
      // Generate a URL for uploading
      const uploadUrl = await ctx.storage.generateUploadUrl();
      
      // Return the upload URL and image ID
      return {
        uploadUrl,
        imageId: args.imageId,
        base64Data: args.base64Data
      };
    } catch (error) {
      console.error("Error generating upload URL:", error);
      throw new ConvexError("Failed to generate upload URL");
    }
  },
});

// Update the image with the storage ID after upload
export const updateImageWithStorageId = mutation({
  args: {
    imageId: v.id("images"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the image record
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }

    // Verify the user owns this image
    if (image.userId !== identity.subject) {
      throw new ConvexError("Not authorized to update this image");
    }

    // Get the URL for the stored image
    const cartoonImageUrl = await ctx.storage.getUrl(args.storageId);
    if (!cartoonImageUrl) {
      throw new ConvexError("Failed to get URL for uploaded image");
    }
    
    // We'll handle proper image display via Content-Type on the client side

    // Update the image record with the storage ID and URL
    await ctx.db.patch(args.imageId, {
      cartoonStorageId: args.storageId,
      cartoonImageUrl: cartoonImageUrl,
      status: "completed",
      updatedAt: Date.now(),
    });

    return cartoonImageUrl;
  },
});

// Store a user record (typically called after sign-in)
export const storeUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    /**
     * Query the database for a user with the specified Clerk ID.
     * Uses the "by_user_id" index to find a unique user record.
     */
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    // Create a new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      userId: args.clerkId,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get all processing images for a user
export const getUserProcessingImages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all images that are in processing state for this user
    const processingImages = await ctx.db
      .query("images")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "processing")
        )
      )
      .collect();

    return processingImages;
  },
});

// Generate a thumbnail version from original image
export const generateThumbnail = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.storageId))
      .collect();
    const image = images[0];
    if (!image) {
      throw new ConvexError("Image record not found");
    }

    if (image.status === "processing") {
      return { success: true, status: "processing" };
    }

    await ctx.db.patch(image._id, {
      status: "processing",
      updatedAt: Date.now(),
      type: "thumbnail",
    });

    try {
      // We assume mergedStorageId & mergedImageUrl are set by the client
      await ctx.scheduler.runAfter(0, internal.image.ImageGen, {
        imageUrl: image.mergedImageUrl!,
        userId: image.userId,
        style: "thumbnail"
      });
      return { success: true, status: "processing" };
    } catch (error) {
      await ctx.db.patch(image._id, { status: "pending", updatedAt: Date.now() });
      throw new ConvexError("Failed to schedule thumbnail generation");
    }
  }
});

// Save the merged annotated image
export const saveMergedImage = mutation({
  args: {
    storageId: v.string(),
    referenceStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.referenceStorageId))
      .collect();
    const image = images[0];
    if (!image) {
      throw new ConvexError("Image record not found");
    }
    const mergedUrl = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(image._id, {
      mergedStorageId: args.storageId,
      mergedImageUrl: mergedUrl ?? undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
