import prisma from "@/lib/prismadb"; // Correct import for prisma
import { MAX_FREE_COUNTS } from "@/constants"; // Ensure this constant is defined properly

// Increment the API limit count for the user
export const incrementApiLimit = async (userId: string) => {
  if (!userId) {
    console.log("incrementApiLimit: No userId provided");
    return;
  }

  try {
    const userApiLimit = await prisma.userApiLimit.findUnique({
      where: { userId: userId },
    });

    console.log("Current API limit:", userApiLimit ? userApiLimit.count : 0);

    if (userApiLimit) {
      const updated = await prisma.userApiLimit.update({
        where: { userId: userId },
        data: { count: userApiLimit.count + 1 },
      });
      console.log("API limit incremented to:", updated.count);
    } else {
      const created = await prisma.userApiLimit.create({
        data: { userId: userId, count: 1 },
      });
      console.log("API limit created with count:", created.count);
    }
  } catch (error) {
    console.error("Error incrementing API limit:", error);
    // Log the error but don't throw it to prevent API failure
  }
};

// Check if the user has exceeded their free API limit
export const checkApiLimit = async (userId: string) => {
  if (!userId) {
    console.log("checkApiLimit: No userId provided");
    return false;
  }

  try {
    const userApiLimit = await prisma.userApiLimit.findUnique({
      where: { userId: userId },
    });

    console.log("Checking API limit for user:", userId);
    console.log("Current count:", userApiLimit?.count || 0);
    console.log("MAX_FREE_COUNTS:", MAX_FREE_COUNTS);

    if (!userApiLimit || userApiLimit.count < MAX_FREE_COUNTS) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error checking API limit:", error);
    return false; // Default to false if there's an error
  }
};

// Get the current API limit count for the user
export const getApiLimitCount = async (userId: string) => {
  if (!userId) {
    console.log("getApiLimitCount: No userId provided");
    return 0;
  }

  try {
    const userApiLimit = await prisma.userApiLimit.findUnique({
      where: { userId }
    });

    return userApiLimit?.count || 0;
  } catch (error) {
    console.error("Error getting API limit count:", error);
    return 0; // Default to 0 if there's an error
  }
};
