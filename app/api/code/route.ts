import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/subscription";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

// Working models for code generation (tested April 2025)
const CODE_MODELS = [
  "codellama/CodeLlama-34b-Instruct",  // Best for code generation
  "mistralai/Mixtral-8x7B-Instruct-v0.1", // Good for complex code
  "bigcode/starcoder2-15b"            // Alternative for code generation
];

export const maxDuration = 30; // Maximum execution time

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
          max_new_tokens: 1024,  // Higher token count for code generation
          temperature: 0.5,      // Lower temperature for more deterministic outputs
          return_full_text: false
        },
        options: {
          wait_for_model: true  // Crucial for free tier
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
    // 1. Authentication
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 2. Input validation
    const { messages } = await req.json();
    if (!messages?.length) return new NextResponse("Messages required", { status: 400 });

    // 3. Check usage limits
    const isPro = await checkSubscription(userId);
    const freeTrial = await checkApiLimit(userId);
    if (!freeTrial && !isPro) return new NextResponse("Free trial expired", { status: 403 });

    // 4. Format prompt specifically for code generation
    const lastMessage = messages[messages.length - 1].content;
    const codePrompt = `
<|user|>
You are a code generator. You must answer only in markdown code snippets. Use code comments for explanations.

${lastMessage}
<|assistant|>`;

    // 5. Try models in order
    for (const model of CODE_MODELS) {
      try {
        const data = await callHuggingFace(model, codePrompt);
        const rawResult = data[0]?.generated_text || "I couldn't generate code for your request.";
        
        // Process the result to ensure it's formatted as code
        let result = rawResult.trim();
        
        // If response doesn't already have markdown code formatting, add it
        if (!result.includes("```")) {
          result = "```\n" + result + "\n```";
        }

        if (!isPro) await incrementApiLimit(userId);

        return NextResponse.json({
          role: "assistant",
          content: result
        });
      } catch (error) {
        console.warn(`Model ${model} failed, trying next...`);
        continue;
      }
    }

    throw new Error("All code models failed to respond");

  } catch (error) {
    console.error("[CODE_ERROR]", error);
    return NextResponse.json(
      { error: "Code generation service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}