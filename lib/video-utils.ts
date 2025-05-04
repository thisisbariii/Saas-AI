import fetch from "node-fetch"; // Ensure you're using node-fetch v2 if needed
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { promisify } from "util";

// Promisify the `ffmpeg` method for better async/await support
const ffmpegPromise = promisify(ffmpeg);

// Utility function to create video from frames
export async function createVideoFromFrames(frames: string[]): Promise<string> {
  const outputPath = path.join(process.cwd(), "public", "output_video.mp4");

  return new Promise((resolve, reject) => {
    const framePattern = path.join(process.cwd(), "public", "frames", "frame-%d.png");

    // Ensure frames directory exists
    if (!fs.existsSync(path.dirname(framePattern))) {
      fs.mkdirSync(path.dirname(framePattern), { recursive: true });
    }

    // Download each frame and save it locally (if frames are URLs)
    const downloadPromises = frames.map(async (url, index) => {
      const response = await fetch(url);
      const buffer = await (response as any).buffer(); // Type casting to any to avoid TypeScript errors
      const framePath = path.join(process.cwd(), "public", "frames", `frame-${index + 1}.png`);
      fs.writeFileSync(framePath, buffer);
    });

    // Wait until all frames are downloaded
    Promise.all(downloadPromises)
      .then(() => {
        // Use ffmpeg to combine the frames into a video
        ffmpeg()
          .input(framePattern)
          .inputOptions("-framerate 24") // Set the frames per second
          .outputOptions("-pix_fmt yuv420p") // Ensure compatibility
          .output(outputPath)
          .on("end", () => {
            resolve(outputPath); // Resolve with the output video path
          })
          .on("error", (err: { message: any; }) => {
            reject(new Error(`Error creating video: ${err.message}`)); // Reject if error occurs
          })
          .run(); // Run ffmpeg
      })
      .catch((err) => reject(new Error(`Error downloading frames: ${err.message}`))); // Catch any error during frame download
  });
}
