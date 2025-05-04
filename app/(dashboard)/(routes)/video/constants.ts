import * as z from "zod";

export const formSchema = z.object({
  prompt: z.string().min(1, {
    message: "Prompt is required.",
  }),
  voice: z.string().optional(),
  theme: z.string().optional(),
  language: z.string().optional(),
  duration: z.string().optional(),
});
