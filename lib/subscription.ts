import prisma from "@/lib/prismadb";

const ONE_DAY_IN_MS = 86_400_000;

export const checkSubscription = async (userId: string) => {
  if (!userId) {
    console.error("checkSubscription: No userId provided");
    return false;
  }

  try {
    const userSubscription = await prisma.userSubscription.findUnique({
      where: { userId },
      select: {
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
        stripeCustomerId: true,
      },
    });

    if (!userSubscription) {
      console.log(`No subscription found for user ${userId}`);
      return false;
    }

    // Check if stripeCurrentPeriodEnd is valid
    if (!userSubscription.stripeCurrentPeriodEnd) {
      console.error(`Invalid subscription period end for user ${userId}`);
      return false;
    }

    const currentPeriodEnd = userSubscription.stripeCurrentPeriodEnd.getTime();
    const isValid = userSubscription.stripePriceId && currentPeriodEnd + ONE_DAY_IN_MS > Date.now();

    console.log(`Subscription validity for ${userId}: ${isValid}`);
    console.log(`Current period end: ${new Date(currentPeriodEnd).toLocaleString()}`);
    
    return isValid;
  } catch (error) {
    console.error("Error checking subscription for user " + userId + ":", error);
    return false;
  }
};
