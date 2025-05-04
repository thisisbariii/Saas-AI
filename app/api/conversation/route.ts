// import { auth } from "@clerk/nextjs";
// import { NextResponse } from "next/server";
// import { checkSubscription } from "@/lib/subscription";
// import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

// // Working models (tested June 2024)
// const WORKING_MODELS = [
//   "mistralai/Mistral-7B-Instruct-v0.1",  // Best for general chat
//   "HuggingFaceH4/zephyr-7b-beta",        // Fast responses
//   "google/gemma-7b-it"                   // Good alternative
// ];

// export const maxDuration = 30; // Maximum execution time

// async function callHuggingFace(model: string, prompt: string) {
//   const API_URL = `https://api-inference.huggingface.co/models/${model}`;
  
//   try {
//     const response = await fetch(API_URL, {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({
//         inputs: prompt,
//         parameters: {
//           max_new_tokens: 250,
//           temperature: 0.7,
//           return_full_text: false
//         },
//         options: {
//           wait_for_model: true  // Crucial for free tier
//         }
//       })
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.error || "API request failed");
//     }

//     return await response.json();
//   } catch (error) {
//     console.error(`[HF_ERROR] Model ${model} failed:`, error);
//     throw error;
//   }
// }

// export async function POST(req: Request) {
//   try {
//     // 1. Authentication
//     const { userId } = await auth(); // Make sure to await auth here
//     if (!userId) return new NextResponse("Unauthorized", { status: 401 });

//     // 2. Input validation
//     const { messages } = await req.json();
//     if (!messages?.length) return new NextResponse("Messages required", { status: 400 });

//     // 3. Check usage limits
//     const isPro = await checkSubscription();
//     const freeTrial = await checkApiLimit();
//     if (!freeTrial && !isPro) return new NextResponse("Free trial expired", { status: 403 });

//     // 4. Format prompt for instruct models
//     const lastMessage = messages[messages.length - 1].content;
//     const prompt = `<|user|>\n${lastMessage}\n<|assistant|>`;

//     // 5. Try models in order
//     for (const model of WORKING_MODELS) {
//       try {
//         const data = await callHuggingFace(model, prompt);
//         const result = data[0]?.generated_text || "I couldn't generate a response.";

//         if (!isPro) await incrementApiLimit();

//         return NextResponse.json({
//           role: "assistant",
//           content: result.trim()
//         });
//       } catch (error) {
//         console.warn(`Model ${model} failed, trying next...`);
//         continue;
//       }
//     }

//     throw new Error("All models failed to respond");

//   } catch (error) {
//     console.error("[CONVERSATION_FATAL_ERROR]", error);
//     return NextResponse.json(
//       { error: "AI service unavailable. Please try again later." },
//       { status: 503 }
//     );
//   }
// }
import { auth } from "@clerk/nextjs"; // ✅ FIXED IMPORT
import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/subscription";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

const WORKING_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.1",
  "HuggingFaceH4/zephyr-7b-beta",
  "google/gemma-7b-it",
];

export const maxDuration = 30;

async function callHuggingFace(model: string, prompt: string) {
  const API_URL = `https://api-inference.huggingface.co/models/${model}`;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          return_full_text: false
        },
        options: {
          wait_for_model: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API request failed");
    }

    return await response.json();
  } catch (error) {
    console.error(`[HF_ERROR] Model ${model} failed:`, error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // ✅ FIX: Proper Clerk auth for route handlers
    const { userId } = auth();
    console.log("USER ID:", userId);

    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { messages } = await req.json();
    if (!messages?.length) return new NextResponse("Messages required", { status: 400 });

    const isPro = await checkSubscription(userId);
    const freeTrial = await checkApiLimit(userId);

    if (!freeTrial && !isPro) return new NextResponse("Free trial expired", { status: 403 });

    const lastMessage = messages[messages.length - 1].content;
    const prompt = `<|user|>\n${lastMessage}\n<|assistant|>`;

    for (const model of WORKING_MODELS) {
      try {
        const data = await callHuggingFace(model, prompt);
        const result = data[0]?.generated_text || "I couldn't generate a response.";

        if (!isPro) {
          console.log("Free user — incrementing API limit");
          await incrementApiLimit(userId);
        }

        return NextResponse.json({
          role: "assistant",
          content: result.trim(),
        });
      } catch (error) {
        console.warn(`Model ${model} failed, trying next...`);
        continue;
      }
    }

    throw new Error("All models failed to respond");

  } catch (error) {
    console.error("[CONVERSATION_FATAL_ERROR]", error);
    return NextResponse.json(
      { error: "AI service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
