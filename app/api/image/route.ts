// import { auth } from "@clerk/nextjs/server"; // Must use server import
// import { NextResponse } from "next/server";
// import { checkSubscription } from "@/lib/subscription";
// import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

// export const runtime = 'nodejs'; // Explicitly use Node.js runtime

// export async function POST(req: Request) {
//   try {
//     // 1. First await the request.json() to ensure headers are available
//     const requestPromise = req.json();
    
//     // 2. Then call auth() - this is the correct order per Next.js docs
//     const { userId } = await auth();
    
//     // 3. Now get the request body
//     const body = await requestPromise;
//     const { prompt } = body;

//     if (!userId) {
//       return new NextResponse("Unauthorized", { status: 401 });
//     }

//     if (!prompt) {
//       return new NextResponse("Prompt is required", { status: 400 });
//     }

//     // 4. Check usage limits
//     const [hasFreeTrial, isPro] = await Promise.all([
//       checkApiLimit(userId),
//       checkSubscription(userId)
//     ]);

//     if (!hasFreeTrial && !isPro) {
//       return new NextResponse(
//         "Free trial has expired. Please upgrade to pro.",
//         { status: 403 }
//       );
//     }

//     // 5. Call Hugging Face API
//     const response = await fetch(
//       "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
//       {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ 
//           inputs: prompt,
//           options: {
//             wait_for_model: true
//           }
//         }),
//       }
//     );

//     // 6. Verify API response was successful
//     if (!response.ok) {
//       const error = await response.json();
//       console.error("Hugging Face API Error:", error);
//       return new NextResponse(
//         error.error || "Image generation failed",
//         { status: response.status }
//       );
//     }

//     // 7. Get the image buffer (verifies successful generation)
//     const imageBuffer = await response.arrayBuffer();
//     console.log("Image successfully generated");

//     // 8. Only increment limit AFTER successful generation
//     if (!isPro) {
//       await incrementApiLimit(userId);
//       console.log(`Incremented API limit for user ${userId}`);
//     }

//     // 9. Return the generated image
//     return new NextResponse(imageBuffer, {
//       headers: {
//         "Content-Type": "image/png",
//         "Cache-Control": "public, max-age=31536000, immutable",
//       },
//     });

//   } catch (error) {
//     console.error("[IMAGE_GENERATION_ERROR]", error);
//     return new NextResponse("Internal Server Error", { 
//       status: 500,
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//   }
// }
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/subscription";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Correct use of auth(), no arguments required
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get the request body
    const body = await req.json();
    const { prompt } = body;
    
    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }
    
    // Check usage limits
    const [hasFreeTrial, isPro] = await Promise.all([
      checkApiLimit(userId),
      checkSubscription(userId)
    ]);
    
    if (!hasFreeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }
    
    // Call Hugging Face API for image generation
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Hugging Face API Error:", error);
      return new NextResponse(error.error || "Image generation failed", { status: response.status });
    }
    
    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Increment API limit for non-pro users
    if (!isPro) {
      await incrementApiLimit(userId);
    }
    
    // Return the generated image
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[IMAGE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}