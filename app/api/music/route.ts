import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt, format = "wav", looping = false } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // Check access rights
    const isPro = await checkSubscription(userId);
    const hasAccess = isPro || await checkApiLimit(userId);

    if (!hasAccess) {
      return new NextResponse("Free trial expired", { status: 403 });
    }

    const response = await fetch(
      `${process.env.BEATOVEN_API_BASE}/api/v1/tracks/compose`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.BEATOVEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: { text: prompt },
          format,
          looping
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Beatoven API error:", response.status, error);
      return new NextResponse(`Music generation failed: ${error}`, { 
        status: response.status 
      });
    }

    const data = await response.json();

    if (!isPro) {
      await incrementApiLimit(userId);
    }

    return NextResponse.json({
      taskId: data.task_id,
      status: data.status
    });

  } catch (error) {
    console.error("[MUSIC_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}