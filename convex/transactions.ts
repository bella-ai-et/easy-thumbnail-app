import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import {
    Webhook,
    WebhookVerificationError
} from "standardwebhooks";
import { api } from "./_generated/api";
import {
    action,
    httpAction,
    mutation,
    query
} from "./_generated/server";


// Create a one-time payment checkout for image generations
const createCheckout = async ({
    customerEmail,
    productPriceId,
    successUrl,
    metadata
}: {
    customerEmail: string;
    productPriceId: string;
    successUrl: string;
    metadata?: Record<string, string>;
}) => {

    if (!process.env.POLAR_ACCESS_TOKEN) {
        throw new Error("POLAR_ACCESS_TOKEN is not configured");
    }

    const polar = new Polar({
        server: process.env.FRONTEND_URL?.endsWith(".fyi") ? "production" : "sandbox",
        accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    console.log("Initialized Polar SDK with token:", process.env.POLAR_ACCESS_TOKEN?.substring(0, 8) + "...");

    // Make sure we have a proper URL with scheme, not just a relative path
    const fullSuccessUrl = successUrl.startsWith('http') ? successUrl : `https://${successUrl}`;

    // Create a one-time payment checkout
    const result = await polar.checkouts.create({
        productPriceId: productPriceId,
        successUrl: fullSuccessUrl,
        customerEmail: customerEmail,
        metadata
    });

    return result;
};

// Get available plans - for one-time payments we'll have a single plan for 10 image generations
export const getPlansPolar = action({
    handler: async () => {
        const polar = new Polar({
            server: process.env.FRONTEND_URL?.endsWith(".fyi") ? "production" : "sandbox",
            accessToken: process.env.POLAR_ACCESS_TOKEN,
        });

        const { result } = await polar.products.list({
            organizationId: process.env.POLAR_ORGANIZATION_ID,
            isArchived: false
        });

        // Transform the data to show one-time payments instead of subscriptions
        const cleanedItems = result.items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            // Always set to false for one-time payments
            isRecurring: false,
            prices: item.prices.map((price: any) => ({
                id: price.id,
                amount: price.priceAmount,
                currency: price.priceCurrency,
                // Not using interval for one-time payments
                interval: null
            }))
        }));

        return {
            items: cleanedItems,
            pagination: result.pagination
        };
    },
});

// Get a checkout URL for purchasing 10 image generations for $3
export const getImagePackCheckoutUrl = action({
    args: {
        priceId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Try to get the user
        let user = await ctx.runQuery(api.users.getUserByToken, {
            userId: identity.subject
        });

        // If user doesn't exist, create them
        if (!user) {
            // Create user with information from the identity
            await ctx.runMutation(api.users.createOrUpdateUser, {
                userId: identity.subject,
                email: identity.email || "",
                name: identity.name || identity.nickname || identity.givenName || ""
            });

            // Fetch the newly created user
            user = await ctx.runQuery(api.users.getUserByToken, {
                userId: identity.subject
            });

            if (!user) {
                throw new Error("Failed to create user");
            }
        }

        // Ensure we have a valid FRONTEND_URL with proper scheme
        if (!process.env.FRONTEND_URL) {
            throw new Error("FRONTEND_URL environment variable must be a complete URL starting with http:// or https://");
        }

        const checkout = await createCheckout({
            customerEmail: user.email,
            productPriceId: args.priceId,
            successUrl: `${process.env.FRONTEND_URL}/success`,
            metadata: {
                userId: user.userId,
                // This is a one-time payment for 10 image generations
                purchaseType: "image_pack",
                quantity: "10"
            }
        });

        return checkout.url;
    },
});

// We maintain backward compatibility with the old function name
export const getProOnboardingCheckoutUrl = getImagePackCheckoutUrl;

// Check how many image credits a user has remaining
export const getUserCreditsStatus = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { hasActiveSubscription: false, remainingCredits: 0 };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) =>
                q.eq("userId", identity.subject)
            )
            .unique();

        if (!user) {
            return { hasActiveSubscription: false, remainingCredits: 0 };
        }

        // Use a type assertion to access imageCredits
        const userWithCredits = user as unknown as { imageCredits?: number };
        // Default to 0 if not defined yet
        const remainingCredits = userWithCredits.imageCredits || 0;

        // For compatibility with code expecting subscription model
        const hasActiveSubscription = remainingCredits > 0;

        return { hasActiveSubscription, remainingCredits };
    }
});

// For backwards compatibility with previous subscription-based model
export const getUserSubscriptionStatus = getUserCreditsStatus;

// Initialize a user with image credits when they first sign up
export const initializeUserImageCredits = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;
        const user = await ctx.db.get(userId);

        if (!user) {
            throw new Error("User not found");
        }

        // Use a type assertion to access and check imageCredits
        const userWithCredits = user as unknown as { imageCredits?: number };

        // Check if we need to initialize image credits
        if (userWithCredits.imageCredits === undefined) {
            await ctx.db.patch(userId, {
                imageCredits: 0  // Start with 0 credits
            } as any); // Using type assertion to bypass TypeScript checking
            return { success: true, message: "User initialized with 0 image credits" };
        }

        return { success: true, message: "User already has image credits initialized" };
    }
});

// Get a user's credit purchase history
export const getUserPurchaseHistory = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) =>
                q.eq("userId", identity.subject)
            )
            .unique();

        if (!user) {
            return [];
        }

        // Fetch transactions for this user
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q: any) => q.eq("userId", identity.subject))
            .order("desc")
            .collect();

        return transactions;
    }
});

// For backwards compatibility
export const getUserSubscription = getUserPurchaseHistory;

// Deduct a credit when an image is successfully generated
export const deductImageCredit = mutation({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { success: false, message: "Not authenticated" };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) =>
                q.eq("userId", identity.subject)
            )
            .unique();

        if (!user) {
            return { success: false, message: "User not found" };
        }

        // Use a type assertion to access imageCredits
        const userWithCredits = user as unknown as { imageCredits?: number };
        // Default to 0 if not defined yet
        const currentCredits = userWithCredits.imageCredits || 0;
        
        // Check if user has enough credits
        if (currentCredits <= 0) {
            return { success: false, message: "No credits available", remainingCredits: 0 };
        }

        // Deduct 1 credit
        await ctx.db.patch(user._id, {
            imageCredits: currentCredits - 1
        } as any); // Using type assertion to bypass TypeScript checking

        // No need to log this in a separate table, we'll track it through user credits only
        console.log(`[deductImageCredit] Deducted 1 credit from user ${identity.subject}, remaining: ${currentCredits - 1}`);

        return { success: true, message: "Credit deducted", remainingCredits: currentCredits - 1 };
    }
});

// Handle payment webhook events from Polar
export const paymentWebhookHandler = mutation({
    args: {
        body: v.any(),
    },
    handler: async (ctx, args) => {
        try {
            // Extract event type from webhook payload
            const eventType = args.body.type;

            // Store webhook event for debugging/auditing
            await ctx.db.insert("webhookEvents", {
                type: eventType,
                polarEventId: args.body.data.id,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                data: JSON.stringify(args.body.data),
            });

            // Handle successful one-time payments
            if (eventType === 'order.updated') {
                // Extract metadata from the order
                const metadata = args.body.data.metadata || {};
                const userId = metadata.userId;
                const quantity = parseInt(metadata.quantity || "10", 10);

                if (!userId) {
                    console.error("Missing user information in order metadata");
                    return;
                }

                // Record the transaction in our database
                await ctx.db.insert("transactions", {
                    userId: userId,
                    polarId: args.body.data.product_price.id,
                    polarPriceId: args.body.data.product_price.product_id,
                    amount: args.body.data.amount,
                    currency: args.body.data.currency,
                    status: args.body.data.status,
                    purchaseType: "image_pack",
                    quantity: quantity,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                });

                // Update the user's credit balance directly
                try {
                    // Find the user by ID
                    const user = await ctx.db.query("users").withIndex("by_user_id", (q) => q.eq("userId", userId)).first();
                    if (user) {
                        // Add the purchased credits to their existing balance
                        const userWithCredits = user as unknown as { imageCredits?: number };
                        const currentCredits = userWithCredits.imageCredits || 0;
                        
                        // Use user._id (Convex document ID) to patch the record, not the auth userId
                        await ctx.db.patch(user._id, {
                            imageCredits: currentCredits + quantity
                        } as any);
                        console.log(`Added ${quantity} image credits to user ${userId}, document ID: ${user._id}`);
                    }
                } catch (error) {
                    console.error("Error updating user credits:", error);
                }
            }
            // Handle payment failure scenarios
            else if (eventType === 'payment.failed') {
                console.log("Payment failed:", args.body.data.id);
                // We just log the failure for now
            }
        } catch (error) {
            console.error("Error in webhook handler:", error);
        }
    },
});

// Use our own validation similar to validateEvent from @polar-sh/sdk/webhooks
// Updated to handle different possible header formats
// Use our own validation similar to validateEvent from @polar-sh/sdk/webhooks
// The only diffference is we use btoa to encode the secret since Convex js runtime doesn't support Buffer
const validateEvent = (
    body: string | Buffer,
    headers: Record<string, string>,
    secret: string,
) => {
    const base64Secret = btoa(secret);
    const webhook = new Webhook(base64Secret);
    webhook.verify(body, headers);
};

export const paymentWebhook = httpAction(async (ctx, request) => {
    try {
        const rawBody = await request.text();

        // Internally validateEvent uses headers as a dictionary e.g. headers["webhook-id"]
        // So we need to convert the headers to a dictionary 
        // (request.headers is a Headers object which is accessed as request.headers.get("webhook-id"))
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });

        // Validate the webhook event
        validateEvent(
            rawBody,
            headers,
            process.env.POLAR_WEBHOOK_SECRET ?? '',
        )

        const body = JSON.parse(rawBody);

        // track events and based on events store data
        await ctx.runMutation(api.transactions.paymentWebhookHandler, {
            body
        });

        return new Response(JSON.stringify({ message: "Webhook received!" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });

    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            return new Response(JSON.stringify({ message: "Webhook verification failed" }), {
                status: 403,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }

        console.log("Webhook failed", error);
        return new Response(JSON.stringify({ message: "Webhook failed" }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

});

export const getUserDashboardUrl = action({
    args: {
        customerId: v.string()
    },
    handler: async (_, args) => {
        const polar = new Polar({
            server: process.env.FRONTEND_URL?.endsWith(".fyi") ? "production" : "sandbox",
            accessToken: process.env.POLAR_ACCESS_TOKEN,
        });

        try {
            const result = await polar.customerSessions.create({
                customerId: args.customerId,
            });

            // Only return the URL to avoid Convex type issues
            return { url: result.customerPortalUrl };
        } catch (error) {
            console.error("Error creating customer session:", error);
            throw new Error("Failed to create customer session");
        }
    }
});
