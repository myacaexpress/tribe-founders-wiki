"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ExtractedItem {
  type: "task" | "decision" | "idea" | "question";
  content: string;
  owner?: string;
  confidence?: "high" | "medium";
}

interface ReviewItem extends ExtractedItem {
  status: "pending" | "confirmed" | "skipped";
  editedContent?: string;
  editedOwner?: string;
  isEditing?: boolean;
}

interface ProcessingResult {
  transcript: string;
  items: ExtractedItem[];
  summary?: string;
}

type PageState = "idle" | "recording" | "processing" | "review" | "saving" | "saved" | "briefing" | "error";

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
  const [summary, setSummary] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [briefContent, setBriefContent] = useState("");
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
      setSummary(processData.summary || "");
      // Convert extracted items to review items
      const mapped: ReviewItem[] = (processData.items || []).map((item) => ({
        ...item,
        status: "pending" as const,
      }));
      setReviewItems(mapped);
      setState("review");
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

  const generateBrief = async () => {
    setState("briefing");
    try {
      const response = await fetch("/api/meeting/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meetingTitle || "Founders Sync" }),
      });

      if (!response.ok) throw new Error("Failed to generate brief");

      const data = await response.json();
      setBriefContent(data.brief);
    } catch (error) {
      console.error("Error generating brief:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate brief"
      );
      setState("error");
    }
  };

  const resetForm = () => {
    setMeetingTitle("");
    setAttendees({ shawn: true, mark: true, michael: true });
    setTranscript("");
    setSummary("");
    setReviewItems([]);
    setErrorMessage("");
    setSaveMessage("");
    setBriefContent("");
    setRecordingTime(0);
    chunksRef.current = [];
    setState("idle");
  };

  // --- Review screen helpers ---

  const updateReviewItem = (index: number, updates: Partial<ReviewItem>) => {
    setReviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const confirmItem = (index: number) => {
    updateReviewItem(index, { status: "confirmed", isEditing: false });
  };

  const skipItem = (index: number) => {
    updateReviewItem(index, { status: "skipped", isEditing: false });
  };

  const toggleEdit = (index: number) => {
    const item = reviewItems[index];
    updateReviewItem(index, {
      isEditing: !item.isEditing,
      editedContent: item.editedContent ?? item.content,
      editedOwner: item.editedOwner ?? item.owner ?? "",
    });
  };

  const confirmAll = () => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.status === "pending" ? { ...item, status: "confirmed" } : item
      )
    );
  };

  const saveConfirmed = async () => {
    const confirmed = reviewItems.filter((item) => item.status === "confirmed");
    if (confirmed.length === 0) return;

    setState("saving");

    try {
      const payload = {
        items: confirmed.map((item) => ({
          type: item.type,
          text: item.editedContent || item.content,
          owner: item.editedOwner || item.owner,
          confidence: item.confidence,
        })),
        meetingTitle: meetingTitle || `Meeting ${new Date().toISOString().split("T")[0]}`,
        meetingDate: new Date().toISOString().split("T")[0],
      };

      const response = await fetch("/api/meeting/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save items");
      }

      const data = await response.json();
      const saved = data.saved;
      const parts: string[] = [];
      if (saved.tasks > 0) parts.push(`${saved.tasks} task${saved.tasks > 1 ? "s" : ""}`);
      if (saved.decisions > 0) parts.push(`${saved.decisions} decision${saved.decisions > 1 ? "s" : ""}`);
      if (saved.ideas > 0) parts.push(`${saved.ideas} idea${saved.ideas > 1 ? "s" : ""}`);
      if (saved.questions > 0) parts.push(`${saved.questions} question${saved.questions > 1 ? "s" : ""}`);

      setSaveMessage(`Saved ${parts.join(", ")} to the wiki.`);
      setState("saved");
    } catch (error) {
      console.error("Error saving items:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save items"
      );
      setState("error");
    }
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

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={startRecording}
                  className="w-full py-4 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                >
                  Start Recording
                </button>
                <button
                  onClick={generateBrief}
                  className="w-full py-3 px-4 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#faf7f2] transition-colors"
                >
                  Generate Pre-Meeting Brief
                </button>
              </div>
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

        {/* BRIEFING STATE */}
        {state === "briefing" && !briefContent && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Generating Brief
            </h1>
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b8a88]" />
              <p className="text-lg text-[#1a1a1a] font-medium">
                Pulling data from the wiki...
              </p>
            </div>
          </>
        )}

        {state === "briefing" && briefContent && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Pre-Meeting Brief
            </h1>
            <div className="space-y-6">
              <div className="bg-white border border-[#eae4da] rounded-lg p-6">
                <div className="prose prose-sm max-w-none text-[#1a1a1a]">
                  {briefContent.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) {
                      return (
                        <h1
                          key={i}
                          className="serif-heading text-xl mb-2 text-[#1a1a1a]"
                        >
                          {line.replace("# ", "")}
                        </h1>
                      );
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <h2
                          key={i}
                          className="serif-heading text-lg mt-4 mb-2 text-[#2b8a88]"
                        >
                          {line.replace("## ", "")}
                        </h2>
                      );
                    }
                    if (line.startsWith("### ")) {
                      return (
                        <h3
                          key={i}
                          className="text-sm font-bold mt-3 mb-1 text-[#1a1a1a] capitalize"
                        >
                          {line.replace("### ", "")}
                        </h3>
                      );
                    }
                    if (line.startsWith("- [ ] ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 text-sm">
                          <span className="text-[#8a8580] mt-0.5">&#9633;</span>
                          <span>{line.replace("- [ ] ", "")}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 text-sm">
                          <span className="text-[#2b8a88] mt-0.5">&#8226;</span>
                          <span>{line.replace("- ", "")}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("**")) {
                      return (
                        <p key={i} className="text-sm text-[#8a8580]">
                          {line.replace(/\*\*/g, "")}
                        </p>
                      );
                    }
                    if (line.trim() === "") {
                      return <div key={i} className="h-2" />;
                    }
                    return (
                      <p key={i} className="text-sm">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setBriefContent("");
                    setState("idle");
                  }}
                  className="w-full py-3 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Ready — Start Recording
                </button>
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#faf7f2] transition-colors"
                >
                  Back
                </button>
              </div>
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

        {/* REVIEW STATE */}
        {state === "review" && (
          <>
            <h1 className="serif-heading text-3xl mb-2 text-[#1a1a1a]">
              Review Meeting Items
            </h1>
            {summary && (
              <p className="text-[#8a8580] text-sm mb-6">{summary}</p>
            )}

            <div className="space-y-6">
              {/* Confirm All banner */}
              {reviewItems.some((i) => i.status === "pending") && (
                <div className="flex items-center justify-between bg-white border border-[#eae4da] rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {reviewItems.filter((i) => i.status === "pending").length} item{reviewItems.filter((i) => i.status === "pending").length !== 1 ? "s" : ""} pending review
                    </p>
                    <p className="text-xs text-[#8a8580]">
                      {reviewItems.filter((i) => i.status === "confirmed").length} confirmed, {reviewItems.filter((i) => i.status === "skipped").length} skipped
                    </p>
                  </div>
                  <button
                    onClick={confirmAll}
                    className="px-4 py-2 bg-[#2b8a88] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Confirm All
                  </button>
                </div>
              )}

              {/* Item cards grouped by type */}
              {(["task", "decision", "idea", "question"] as const).map((type) => {
                const typeItems = reviewItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => item.type === type);

                if (typeItems.length === 0) return null;

                return (
                  <div key={type}>
                    <h2 className="serif-heading text-lg mb-3 text-[#1a1a1a] capitalize">
                      {type === "question" ? "Open Questions" : `${type}s`}
                    </h2>
                    <div className="space-y-3">
                      {typeItems.map(({ item, idx }) => (
                        <div
                          key={idx}
                          className={`rounded-lg border transition-all ${
                            item.status === "confirmed"
                              ? "border-[#2b8a88] bg-[#f0f8f7]"
                              : item.status === "skipped"
                              ? "border-[#eae4da] bg-[#f5f4f2] opacity-60"
                              : "border-[#eae4da] bg-white"
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Status indicator */}
                              <div className="flex-shrink-0 mt-1">
                                {item.status === "confirmed" ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#2b8a88] rounded-full text-white text-xs">
                                    &#10003;
                                  </span>
                                ) : item.status === "skipped" ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#8a8580] rounded-full text-white text-xs">
                                    &#8212;
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 border-2 border-[#eae4da] rounded-full" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {item.isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={item.editedContent ?? item.content}
                                      onChange={(e) =>
                                        updateReviewItem(idx, {
                                          editedContent: e.target.value,
                                        })
                                      }
                                      rows={2}
                                      className="w-full px-3 py-2 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#2b8a88] focus:ring-1 focus:ring-[#2b8a88]"
                                    />
                                    {(item.type === "task" || item.type === "idea") && (
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-[#8a8580]">
                                          {item.type === "task" ? "Owner:" : "Speaker:"}
                                        </label>
                                        <select
                                          value={item.editedOwner ?? item.owner ?? ""}
                                          onChange={(e) =>
                                            updateReviewItem(idx, {
                                              editedOwner: e.target.value,
                                            })
                                          }
                                          className="px-2 py-1 border border-[#eae4da] rounded text-sm bg-white text-[#1a1a1a]"
                                        >
                                          <option value="">Unassigned</option>
                                          <option value="shawn">Shawn</option>
                                          <option value="mark">Mark</option>
                                          <option value="michael">Michael</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className={`text-sm font-medium ${
                                      item.status === "skipped"
                                        ? "text-[#8a8580] line-through"
                                        : "text-[#1a1a1a]"
                                    }`}>
                                      {item.editedContent || item.content}
                                    </p>
                                    {(item.owner || item.editedOwner) && (
                                      <p className="text-xs text-[#8a8580] mt-1">
                                        {item.type === "task" ? "Owner" : "Speaker"}:{" "}
                                        <span className="capitalize">
                                          {item.editedOwner || item.owner}
                                        </span>
                                      </p>
                                    )}
                                    {item.confidence && (
                                      <span
                                        className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${
                                          item.confidence === "high"
                                            ? "bg-[#f0f8f7] text-[#2b8a88]"
                                            : "bg-[#fef9f0] text-[#e8a33d]"
                                        }`}
                                      >
                                        {item.confidence} confidence
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Badge */}
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${getItemBadgeColor(
                                  item.type
                                )}`}
                              >
                                {item.type.charAt(0).toUpperCase() +
                                  item.type.slice(1)}
                              </span>
                            </div>

                            {/* Action buttons */}
                            {item.status !== "confirmed" && item.status !== "skipped" && (
                              <div className="flex items-center gap-2 mt-3 ml-8">
                                <button
                                  onClick={() => confirmItem(idx)}
                                  className="px-3 py-1.5 bg-[#2b8a88] text-white text-xs font-semibold rounded hover:opacity-90 transition-opacity"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => toggleEdit(idx)}
                                  className="px-3 py-1.5 border border-[#eae4da] text-[#1a1a1a] text-xs font-semibold rounded hover:bg-[#faf7f2] transition-colors"
                                >
                                  {item.isEditing ? "Done Editing" : "Edit"}
                                </button>
                                <button
                                  onClick={() => skipItem(idx)}
                                  className="px-3 py-1.5 text-[#8a8580] text-xs font-semibold rounded hover:bg-[#f5f4f2] transition-colors"
                                >
                                  Skip
                                </button>
                              </div>
                            )}

                            {/* Undo for confirmed/skipped */}
                            {(item.status === "confirmed" || item.status === "skipped") && (
                              <div className="mt-2 ml-8">
                                <button
                                  onClick={() => updateReviewItem(idx, { status: "pending" })}
                                  className="text-xs text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
                                >
                                  Undo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Collapsible transcript */}
              <details className="bg-white border border-[#eae4da] rounded-lg">
                <summary className="p-4 cursor-pointer text-sm font-medium text-[#8a8580] hover:text-[#1a1a1a] transition-colors">
                  View Full Transcript
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-[#1a1a1a] leading-relaxed whitespace-pre-wrap text-xs">
                    {transcript}
                  </p>
                </div>
              </details>

              {/* Save / Reset buttons */}
              <div className="flex flex-col gap-3">
                {reviewItems.some((i) => i.status === "confirmed") && (
                  <button
                    onClick={saveConfirmed}
                    className="w-full py-3 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Save {reviewItems.filter((i) => i.status === "confirmed").length} Confirmed Item{reviewItems.filter((i) => i.status === "confirmed").length !== 1 ? "s" : ""} to Wiki
                  </button>
                )}
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#faf7f2] transition-colors"
                >
                  Discard &amp; Start Over
                </button>
              </div>
            </div>
          </>
        )}

        {/* SAVING STATE */}
        {state === "saving" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Saving to Wiki
            </h1>
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b8a88]" />
              <p className="text-lg text-[#1a1a1a] font-medium">
                Writing items to the wiki...
              </p>
            </div>
          </>
        )}

        {/* SAVED STATE */}
        {state === "saved" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              Meeting Complete
            </h1>
            <div className="space-y-6">
              <div className="bg-[#f0f8f7] border border-[#2b8a88] rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">&#10003;</div>
                <p className="text-[#2b8a88] font-semibold text-lg">{saveMessage}</p>
                <p className="text-[#8a8580] text-sm mt-2">
                  Items have been committed to your GitHub wiki.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="w-full py-3 px-4 bg-[#2b8a88] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-center"
                >
                  Back to Home
                </Link>
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#faf7f2] transition-colors"
                >
                  Record Another Meeting
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
