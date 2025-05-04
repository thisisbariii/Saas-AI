"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Music } from "lucide-react";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader } from "@/components/loader";
import { Empty } from "@/components/ui/empty";
import { useProModal } from "@/hooks/use-pro-modal";

const formSchema = z.object({
  prompt: z.string().min(1, {
    message: "Music prompt is required."
  }),
  mood: z.string().min(1),
  genre: z.string().min(1),
  duration: z.number().min(15).max(120)
});

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" },
  { value: "relaxed", label: "Relaxed" },
  { value: "excited", label: "Excited" }
];

const GENRE_OPTIONS = [
  { value: "cinematic", label: "Cinematic" },
  { value: "pop", label: "Pop" },
  { value: "rock", label: "Rock" },
  { value: "electronic", label: "Electronic" },
  { value: "hiphop", label: "Hip Hop" }
];

const MusicPage = () => {
  const proModal = useProModal();
  const router = useRouter();
  const [music, setMusic] = useState<string>();
  const [trackId, setTrackId] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      mood: "happy",
      genre: "cinematic",
      duration: 30
    }
  });

  const isLoading = form.formState.isSubmitting || isGenerating;

  // Poll for track completion
  useEffect(() => {
    if (!trackId) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/music/status?trackId=${trackId}`);
        const { status, progress, audio } = response.data;

        if (progress) {
          setProgress(progress);
        }

        if (status === 'completed' && audio) {
          clearInterval(interval);
          setMusic(audio);
          setIsGenerating(false);
          setProgress(0);
        } else if (status === 'failed') {
          clearInterval(interval);
          setIsGenerating(false);
          toast.error("Music generation failed");
        }
      } catch (error) {
        clearInterval(interval);
        setIsGenerating(false);
        toast.error("Failed to check status");
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [trackId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setMusic(undefined);
      setTrackId(undefined);
      setIsGenerating(true);

      const response = await axios.post('/api/music', values);
      setTrackId(response.data.trackId);
      
      form.reset();
    } catch (error: any) {
      setIsGenerating(false);
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      router.refresh();
    }
  }

  return ( 
    <div>
      <Heading
        title="Music Generation"
        description="Turn your prompt into music using Beatoven.ai"
        icon={Music}
        iconColor="text-emerald-500"
        bgColor="bg-emerald-500/10"
      />
      <div className="px-4 lg:px-8">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm space-y-4"
          >
            <FormField
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading} 
                      placeholder="Piano solo with a melancholic tone" 
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mood</FormLabel>
                    <Select 
                      disabled={isLoading} 
                      onValueChange={field.onChange} 
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue defaultValue={field.value} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select 
                      disabled={isLoading} 
                      onValueChange={field.onChange} 
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue defaultValue={field.value} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENRE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="15"
                        max="120"
                        disabled={isLoading}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading} size="lg">
              Generate
            </Button>
          </form>
        </Form>
        
        {isLoading && (
          <div className="p-20 space-y-4">
            <Loader />
            {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {progress > 0 
                ? `Generating music... ${progress}% complete` 
                : "Starting music generation..."}
            </p>
          </div>
        )}
        
        {!music && !isLoading && (
          <Empty label="No music generated yet." />
        )}
        
        {music && (
          <div className="mt-8 space-y-4">
            <audio controls className="w-full">
              <source src={`data:audio/mpeg;base64,${music}`} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `data:audio/mpeg;base64,${music}`;
                  link.download = 'beatoven-track.mp3';
                  link.click();
                }}
              >
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicPage;