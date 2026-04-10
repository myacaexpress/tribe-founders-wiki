"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ExtractedItem {
  type: "task" | "decision" | "idea";
  content: string;
}

interface ProcessingResult {
  transcript: string;
  items: ExtractedItem[];
}

type PageState = "idle" | "recording" | "processing" | "done" | "error";

export default function MeetingPage() {
  const [state, setState] = useState<PageState>("idle");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [attendees, setAttendees] = useState({
    shawn: true,
    mark: true,
    michael: true,
  });

  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState<"transcribing" | "processing">(
    "transcribing"
  );

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Waveform visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDataRef = useRef<Uint8Array | null>(null);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for visualization
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Initialize waveform data
      const bufferLength = analyser.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      waveformDataRef.current = frequencyData as any;

      // Start visualization
      const visualize = () => {
        if (analyserRef.current && canvasRef.current && state === "recording") {
          const data = waveformDataRef.current as any;
          if (data) {
            analyserRef.current.getByteFrequencyData(data);
            drawWaveform();
          }
          animationFrameRef.current = requestAnimationFrame(visualize);
        }
      };
      visualize();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      chunksRef.current = [];
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setRecordingTime(0);
      setState("recording");

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setErrorMessage(
        "Unable to access microphone. Please check permissions."
      );
      setState("error");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        // Clean up
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        const stream = mediaRecorderRef.current!.stream;
        stream.getTracks().forEach((track) => track.stop());

        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Create blob and upload
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAndProcess(audioBlob);

        resolve();
      };

      mediaRecorderRef.current.stop();
    });
  };

  const uploadAndProcess = async (audioBlob: Blob) => {
    try {
      setState("processing");
      setProcessingStep("transcribing");

      // Upload to transcription endpoint
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeResponse = await fetch("/api/meeting/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const transcribeData = await transcribeResponse.json();
      setTranscript(transcribeData.transcript);

      // Process transcript
      setProcessingStep("processing");

      const processResponse = await fetch("/api/meeting/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcribeData.transcript,
          title: meetingTitle,
          attendees: Object.keys(attendees).filter((k) =>
            attendees[k as keyof typeof attendees]
          ),
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to process transcript");
      }

      const processData: ProcessingResult = await processResponse.json();
      setItems(processData.items || []);
      setState("done");
    } catch (error) {
      console.error("Error processing recording:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to process recording"
      );
      setState("error");
    }
  };

  const handleAttendeeChange = (attendee: keyof typeof attendees) => {
    setAttendees((prev) => ({
      ...prev,
      [attendee]: !prev[attendee],
    }));
  };

  const resetForm = () => {
    setMeetingTitle("");
    setAttendees({ shawn: true, mark: true, michael: true });
    setTranscript("");
    setItems([]);
    setErrorMessage("");
    setRecordingTime(0);
    chunksRef.current = [];
    setState("idle");
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !waveformDataRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    const barWidth = width / 20;
    const data = waveformDataRef.current;

    ctx.fillStyle = "#2b8a88";
    for (let i = 0; i < 20; i++) {
      const index = Math.floor((i / 20) * data.length);
      const value = data[index] / 255;
      const barHeight = value * height * 0.8;

      const x = i * barWidth + barWidth * 0.1;
      const y = height / 2 - barHeight / 2;

      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-[#f0f8f7] text-[#2b8a88]";
      case "decision":
        return "bg-[#fef4f2] text-[#e85d4e]";
      case "idea":
        return "bg-[#f5f7f4] text-[#a8b5a0]";
      default:
        return "bg-[#faf7f2] text-[#8a8580]";
    }
  };

  const getItemBadgeColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-[#2b8a88] text-white";
      case "decision":
        return "bg-[#e85d4e] text-white";
      case "idea":
        return "bg-[#a8b5a0] text-white";
      default:
        return "bg-[#8a8580] text-white";
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-24">
      <div className="container-main py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
          >
            ← Back
          </Link>
        </div>

        {/* IDLE STATE */}
        {state === "idle" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Record Meeting
            </h1>

            <div className="space-y-6">
              {/* Meeting title input */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Meeting Title (optional)
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Weekly standup, Carrier meeting..."
                  className="w-full px-4 py-3 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] placeholder-[#8a8580] focus:outline-none focus:border-[#2b8a88] focus:ring-2 focus:ring-[#2b8a88] focus:ring-opacity-20 transition-all"
                />
              </div>

              {/* Attendees checkboxes */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  Attendees
                </label>
                <div className="space-y-2">
                  {[
                    {
                      key: "shawn" as const,
                      label: "Shawn",
                      color: "text-[#2b8a88]",
                    },
                    {
                      key: "mark" as const,
                      label: "Mark",
                      color: "text-[#e85d4e]",
                    },
                    {
                      key: "michael" as const,
                      label: "Michael",
                      color: "text-[#a8b5a0]",
                    },
                  ].map(({ key, label, color }) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={attendees[key]}
                        onChange={() => handleAttendeeChange(key)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className={`font-medium ${color}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Start recording button */}
              <button
                onClick={startRecording}
                className="w-full py-4 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                Start Recording
              </button>
            </div>
          </>
        )}

        {/* RECORDING STATE */}
        {state === "recording" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Recording...
            </h1>

            <div className="space-y-6">
              {/* Recording indicator */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-[#e85d4e] rounded-full animate-pulse" />
                <span className="text-[#e85d4e] font-medium">Recording</span>
              </div>

              {/* Elapsed time */}
              <div className="text-center">
                <p className="text-4xl font-mono font-bold text-[#1a1a1a]">
                  {formatTime(recordingTime)}
                </p>
              </div>

              {/* Waveform visualizer */}
              <div className="bg-white rounded-lg border border-[#eae4da] p-4">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={80}
                  className="w-full"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>

              {/* Stop recording button */}
              <button
                onClick={stopRecording}
                className="w-full py-4 px-4 bg-[#e85d4e] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                Stop Recording
              </button>
            </div>
          </>
        )}

        {/* PROCESSING STATE */}
        {state === "processing" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Recording Saved
            </h1>

            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b8a88]" />
              <p className="text-lg text-[#1a1a1a] font-medium">
                {processingStep === "transcribing"
                  ? "Transcribing audio..."
                  : "Processing transcript..."}
              </p>
              <p className="text-sm text-[#8a8580]">
                This may take a moment
              </p>
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {state === "error" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Error
            </h1>

            <div className="space-y-6">
              <div className="bg-[#fef4f2] border border-[#e85d4e] rounded-lg p-4">
                <p className="text-[#e85d4e] font-medium">{errorMessage}</p>
              </div>

              <button
                onClick={resetForm}
                className="w-full py-3 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </>
        )}

        {/* DONE STATE */}
        {state === "done" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Meeting Recorded
            </h1>

            <div className="space-y-6">
              {/* Transcript section */}
              <div className="card">
                <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">
                  Transcript
                </h2>
                <p className="text-[#1a1a1a] leading-relaxed whitespace-pre-wrap text-sm">
                  {transcript}
                </p>
              </div>

              {/* Items section */}
              {items.length > 0 && (
                <div className="card">
                  <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">
                    Extracted Items
                  </h2>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${getItemColor(
                          item.type
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${getItemBadgeColor(
                              item.type
                            )} flex-shrink-0 mt-0.5`}
                          >
                            {item.type.charAt(0).toUpperCase() +
                              item.type.slice(1)}
                          </span>
                          <p className="text-sm font-medium flex-1">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button className="w-full py-3 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                  Save to Wiki
                </button>
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#faf7f2] transition-colors"
                >
                  Start New Recording
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
