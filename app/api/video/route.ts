import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import fetch from "node-fetch";

import { checkApiLimit, incrementApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    // Get the userId from Clerk authentication
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt } = body;

    // Ensure prompt is provided
    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // Check if the user is within API limits or subscribed to Pro plan
    const freeTrial = await checkApiLimit(userId);
    const isPro = await checkSubscription(userId);

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }

    try {
      // Use a valid Hugging Face model for video generation
      const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            prompt: prompt,
            num_inference_steps: 50,  // Adjust steps for quality
            guidance_scale: 7.5,      // Adjust guidance scale
            height: 320,              // Video resolution
            width: 576,               // Video resolution
            fps: 24,                  // Frames per second
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("[VIDEO_ERROR] Hugging Face API error:", errorData);
        return new NextResponse(`Hugging Face API error: ${response.status}`, { status: response.status });
      }

      const prediction = await response.json();

      // Increment API limit if the user is not on the Pro plan
      if (!isPro) {
        await incrementApiLimit(userId);
      }

      return NextResponse.json(prediction);

    } catch (error) {
      console.log("[VIDEO_ERROR] Error with Hugging Face:", error);
      return new NextResponse("Failed to generate video with Hugging Face.", { status: 500 });
    }

  } catch (error) {
    console.log("[VIDEO_ERROR] An unexpected error occurred:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
