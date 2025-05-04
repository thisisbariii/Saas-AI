import * as z from "zod";

export const formSchema = z.object({
  prompt: z.string().min(1, {
    message: "Music prompt is required"
  }),
  mood: z.enum(["happy", "sad", "angry", "relaxed", "excited"]).default("happy"),
  genre: z.enum(["cinematic", "pop", "rock", "electronic", "hiphop"]).default("cinematic"),
  duration: z.number().min(15).max(120).default(30),
  format: z.enum(["wav", "mp3", "aac"]).default("wav"),
  looping: z.boolean().default(false)
});

// Response schemas for type safety
export const composeResponseSchema = z.object({
  status: z.string(),
  task_id: z.string()
});

export const statusResponseSchema = z.object({
  status: z.enum(["composing", "running", "composed", "failed"]),
  meta: z.object({
    project_id: z.string().optional(),
    track_id: z.string().optional(),
    prompt: z.object({
      text: z.string()
    }).optional(),
    version: z.number().optional(),
    track_url: z.string().optional(),
    stems_url: z.object({
      bass: z.string().optional(),
      chords: z.string().optional(),
      melody: z.string().optional(),
      percussion: z.string().optional()
    }).optional()
  }).optional()
});

// Types for easy usage in components
export type FormValues = z.infer<typeof formSchema>;
export type ComposeResponse = z.infer<typeof composeResponseSchema>;
export type StatusResponse = z.infer<typeof statusResponseSchema>;

// Options for UI components
export const MOOD_OPTIONS = [
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" },
  { value: "relaxed", label: "Relaxed" },
  { value: "excited", label: "Excited" }
] as const;

export const GENRE_OPTIONS = [
  { value: "cinematic", label: "Cinematic" },
  { value: "pop", label: "Pop" },
  { value: "rock", label: "Rock" },
  { value: "electronic", label: "Electronic" },
  { value: "hiphop", label: "Hip Hop" }
] as const;

export const FORMAT_OPTIONS = [
  { value: "wav", label: "WAV (High Quality)" },
  { value: "mp3", label: "MP3 (Balanced)" },
  { value: "aac", label: "AAC (Small Size)" }
] as const;