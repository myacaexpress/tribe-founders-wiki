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

type PageState = "idle" | "requesting" | "recording" | "processing" | "review" | "saving" | "saved" | "briefing" | "error";

// Founder email addresses — used for Google Calendar invite attendees
const FOUNDER_EMAILS: Record<string, string> = {
  shawn: "shawn@myacaexpress.com",
  mark: "mark@myaca.com",       // update if different
  michael: "michael@myaca.com", // update if different
};

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
  const [meetUrl, setMeetUrl] = useState("");
  const [meetUrlCopied, setMeetUrlCopied] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false); // avoid closure issues in animation loop

  // Waveform visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDataRef = useRef<Uint8Array | null>(null);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      setState("requesting");
      console.log("[Recording] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Recording] Microphone access granted");

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
      waveformDataRef.current = new Uint8Array(bufferLength) as any;

      // Pick best supported mime type (Safari needs audio/mp4, Firefox needs audio/ogg)
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
          .find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      console.log("[Recording] Using mimeType:", mimeType || "(browser default)");

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : {}
      );

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      chunksRef.current = [];
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Transition to recording state
      isRecordingRef.current = true;
      setState("recording");
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start visualization after React re-renders the canvas (isRecordingRef avoids closure bug)
      setTimeout(() => {
        const visualize = () => {
          if (!isRecordingRef.current) return;
          if (analyserRef.current && canvasRef.current) {
            const data = waveformDataRef.current as any;
            if (data) {
              analyserRef.current.getByteFrequencyData(data);
              drawWaveform();
            }
          }
          animationFrameRef.current = requestAnimationFrame(visualize);
        };
        visualize();
      }, 100);

      console.log("[Recording] Started successfully");
    } catch (error) {
      console.error("[Recording] Error:", error);
      isRecordingRef.current = false;
      const errName = error instanceof Error ? error.name : "";
      const errMsg = error instanceof Error ? error.message : String(error);
      let userMsg: string;
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        userMsg = "Microphone access denied. Please allow microphone access in your browser settings, then try again.";
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        userMsg = "No microphone found. Please connect a microphone and try again.";
      } else if (errName === "NotSupportedError") {
        userMsg = "Audio recording is not supported in this browser. Please use Chrome or Safari.";
      } else {
        userMsg = `Could not start recording: ${errMsg}`;
      }
      setErrorMessage(userMsg);
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
        isRecordingRef.current = false;
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

        // Create blob and upload (use actual recorded mimeType)
        const recMimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: recMimeType });
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
      formData.append("file", audioBlob, "recording.webm");

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

  const startMeetingWithRecording = async () => {
    await startRecording();
  };

  const copyMeetUrl = async () => {
    const urlToCopy = meetUrl;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setMeetUrlCopied(true);
      setTimeout(() => setMeetUrlCopied(false), 2000);
    } catch {
      // Fallback: select an input
    }
  };

  const getMeetShareLinks = () => {
    const url = meetUrl;
    const title = meetingTitle || "Founders Meeting";
    const msg = encodeURIComponent(`Join our ${title}: ${url}`);
    return {
      mailto: `mailto:?subject=${encodeURIComponent(title)}&body=${msg}`,
      imessage: `sms:&body=${msg}`,
    };
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
    setMeetUrl("");
    setMeetUrlCopied(false);
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

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, width, height);

    // Draw waveform bars
    const barWidth = width / 20;
    const data = waveformDataRef.current;

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
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
      case "task":     return "text-[#00c9a7]";
      case "decision": return "text-[#ff7b6b]";
      case "idea":     return "text-[#b8c8b0]";
      default:         return "text-white/60";
    }
  };

  const getItemBadgeColor = (type: string) => {
    switch (type) {
      case "task":     return "bg-[#00c9a7]/20 text-[#00c9a7]";
      case "decision": return "bg-[#ff7b6b]/20 text-[#ff7b6b]";
      case "idea":     return "bg-[#b8c8b0]/20 text-[#b8c8b0]";
      default:         return "bg-white/10 text-white/60";
    }
  };

  const glassStyle = {
    background: "rgba(255,255,255,0.14)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
    borderRadius: "20px",
  } as React.CSSProperties;

  return (
    <div
      className="pb-24 px-5"
      style={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(175deg, rgba(10,46,56,0.9) 0%, rgba(26,74,74,0.8) 25%, rgba(45,107,90,0.7) 40%, rgba(199,106,74,0.7) 65%, rgba(232,149,106,0.6) 80%, rgba(42,26,46,0.92) 100%), url('/bg-sunset.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-lg mx-auto py-8">

        {/* Logo + back */}
        <div className="text-center mb-6">
          <span className="text-3xl font-bold font-serif text-white">Tri</span>
          <span className="text-3xl font-bold font-serif text-[#ff7b6b]">Be</span>
          <p className="text-xs font-semibold text-white/50 tracking-widest mt-1">FOUNDERS — FLORIDA</p>
        </div>
        <div className="mb-6">
          <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">
            ← Back
          </Link>
        </div>

        {/* IDLE STATE */}
        {state === "idle" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Record Meeting
            </h1>

            <div className="space-y-5">
              {/* Meeting title input */}
              <div className="rounded-2xl border border-white/30 p-5" style={glassStyle}>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Meeting Title (optional)
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Weekly standup, Carrier meeting..."
                  className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/60 transition-all bg-white/10 border border-white/30"
                />
              </div>

              {/* Attendees checkboxes */}
              <div className="rounded-2xl border border-white/30 p-5" style={glassStyle}>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Attendees
                </label>
                <div className="space-y-3">
                  {[
                    { key: "shawn" as const, label: "Shawn", color: "text-[#00c9a7]" },
                    { key: "mark" as const,  label: "Mark",  color: "text-[#ff7b6b]" },
                    { key: "michael" as const, label: "Michael", color: "text-[#b8c8b0]" },
                  ].map(({ key, label, color }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attendees[key]}
                        onChange={() => handleAttendeeChange(key)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className={`font-semibold ${color}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={startMeetingWithRecording}
                  className="w-full py-4 px-6 bg-[#00c9a7] text-white rounded-full font-bold text-lg hover:opacity-90 transition-opacity text-center"
                >
                  Start Meeting + Record
                </button>
                <button
                  onClick={startRecording}
                  className="w-full py-3 px-6 border border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  Record Audio Only
                </button>
                <button
                  onClick={generateBrief}
                  className="w-full py-3 px-6 border border-white/20 text-white/70 rounded-full font-semibold hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                >
                  Generate Pre-Meeting Brief
                </button>
              </div>
            </div>
          </>
        )}

        {/* REQUESTING STATE */}
        {state === "requesting" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Starting Recording
            </h1>
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00c9a7]" />
              <p className="text-lg text-white font-medium">Requesting microphone access...</p>
              <p className="text-sm text-white/50 text-center px-4">Please allow microphone access when your browser prompts you</p>
            </div>
          </>
        )}

        {/* RECORDING STATE */}
        {state === "recording" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Meeting in Progress
            </h1>

            <div className="space-y-5">
              {/* Recording indicator + timer */}
              <div className="rounded-2xl border border-white/30 p-6 text-center" style={glassStyle}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-[#e85d4e] rounded-full animate-pulse" />
                  <span className="text-[#ff7b6b] font-semibold tracking-wide">RECORDING</span>
                </div>
                <p className="text-5xl font-mono font-bold text-white">
                  {formatTime(recordingTime)}
                </p>
              </div>

              {/* Waveform visualizer */}
              <div className="rounded-xl p-4 border border-white/20" style={{ background: "rgba(0,0,0,0.2)" }}>
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={80}
                  className="w-full"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>

              {/* Google Meet */}
              <div className="rounded-2xl border border-white/30 p-5 space-y-3" style={glassStyle}>
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-6 bg-[#00c9a7] text-white rounded-full font-bold text-center hover:opacity-90 transition-opacity"
                >
                  Open Google Meet
                </a>
                <p className="text-xs text-white/50 text-center">
                  Paste your Meet link below to share with attendees
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetUrl}
                    onChange={(e) => setMeetUrl(e.target.value)}
                    placeholder="meet.google.com/xxx-xxxx-xxx"
                    className="flex-1 px-3 py-2 text-sm rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/60 bg-white/10 border border-white/30"
                  />
                  {meetUrl && (
                    <button
                      onClick={copyMeetUrl}
                      className="px-4 py-2 text-sm bg-[#00c9a7] text-white rounded-full font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      {meetUrlCopied ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
                {meetUrl && (
                  <div className="flex gap-2">
                    <a
                      href={getMeetShareLinks().mailto}
                      className="flex-1 py-2 px-3 text-sm text-center border border-white/20 rounded-full text-white/80 hover:bg-white/10 transition-colors"
                    >
                      Email
                    </a>
                    <a
                      href={getMeetShareLinks().imessage}
                      className="flex-1 py-2 px-3 text-sm text-center border border-white/20 rounded-full text-white/80 hover:bg-white/10 transition-colors"
                    >
                      iMessage
                    </a>
                  </div>
                )}
              </div>

              {/* Stop recording button */}
              <button
                onClick={stopRecording}
                className="w-full py-4 px-6 bg-[#e85d4e] text-white rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
              >
                End Meeting &amp; Transcribe
              </button>
            </div>
          </>
        )}

        {/* PROCESSING STATE */}
        {state === "processing" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Processing
            </h1>
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00c9a7]" />
              <p className="text-lg text-white font-medium">
                {processingStep === "transcribing"
                  ? "Transcribing audio..."
                  : "Processing transcript..."}
              </p>
              <p className="text-sm text-white/50">This may take a moment</p>
            </div>
          </>
        )}

        {/* BRIEFING STATE — loading */}
        {state === "briefing" && !briefContent && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Generating Brief
            </h1>
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00c9a7]" />
              <p className="text-lg text-white font-medium">Pulling data from the wiki...</p>
            </div>
          </>
        )}

        {/* BRIEFING STATE — content */}
        {state === "briefing" && briefContent && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">
              Pre-Meeting Brief
            </h1>
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/30 p-6" style={glassStyle}>
                <div className="prose prose-sm max-w-none">
                  {briefContent.split("\n").map((line, i) => {
                    if (line.startsWith("# "))
                      return <h1 key={i} className="serif-heading text-xl mb-2 text-white">{line.replace("# ", "")}</h1>;
                    if (line.startsWith("## "))
                      return <h2 key={i} className="serif-heading text-lg mt-4 mb-2 text-[#00c9a7]">{line.replace("## ", "")}</h2>;
                    if (line.startsWith("### "))
                      return <h3 key={i} className="text-sm font-bold mt-3 mb-1 text-white capitalize">{line.replace("### ", "")}</h3>;
                    if (line.startsWith("- [ ] "))
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 text-sm text-white/80">
                          <span className="text-white/40 mt-0.5">&#9633;</span>
                          <span>{line.replace("- [ ] ", "")}</span>
                        </div>
                      );
                    if (line.startsWith("- "))
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 text-sm text-white/80">
                          <span className="text-[#00c9a7] mt-0.5">&#8226;</span>
                          <span>{line.replace("- ", "")}</span>
                        </div>
                      );
                    if (line.startsWith("**"))
                      return <p key={i} className="text-sm text-white/60">{line.replace(/\*\*/g, "")}</p>;
                    if (line.trim() === "")
                      return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm text-white/80">{line}</p>;
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setBriefContent(""); setState("idle"); }}
                  className="w-full py-4 px-6 bg-[#00c9a7] text-white rounded-full font-bold hover:opacity-90 transition-opacity"
                >
                  Ready — Start Recording
                </button>
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-6 border border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.15)" }}
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
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">Error</h1>
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#ff7b6b]/40 p-5" style={{ background: "rgba(232,93,78,0.15)" }}>
                <p className="text-[#ff7b6b] font-medium">{errorMessage}</p>
              </div>
              <button
                onClick={resetForm}
                className="w-full py-4 px-6 bg-[#00c9a7] text-white rounded-full font-bold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </>
        )}

        {/* REVIEW STATE */}
        {state === "review" && (
          <>
            <h1 className="serif-heading text-3xl mb-2 text-white font-bold">
              Review Meeting Items
            </h1>
            {summary && (
              <p className="text-white/60 text-sm mb-6">{summary}</p>
            )}

            <div className="space-y-6">
              {/* Confirm All banner */}
              {reviewItems.some((i) => i.status === "pending") && (
                <div className="flex items-center justify-between rounded-2xl border border-white/30 p-4" style={glassStyle}>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {reviewItems.filter((i) => i.status === "pending").length} item{reviewItems.filter((i) => i.status === "pending").length !== 1 ? "s" : ""} pending
                    </p>
                    <p className="text-xs text-white/50">
                      {reviewItems.filter((i) => i.status === "confirmed").length} confirmed · {reviewItems.filter((i) => i.status === "skipped").length} skipped
                    </p>
                  </div>
                  <button
                    onClick={confirmAll}
                    className="px-4 py-2 bg-[#00c9a7] text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
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
                    <h2 className="serif-heading text-lg mb-3 text-white font-bold capitalize">
                      {type === "question" ? "Open Questions" : `${type}s`}
                    </h2>
                    <div className="space-y-3">
                      {typeItems.map(({ item, idx }) => (
                        <div
                          key={idx}
                          className="rounded-2xl border transition-all"
                          style={{
                            background: item.status === "confirmed"
                              ? "rgba(0,201,167,0.15)"
                              : item.status === "skipped"
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(255,255,255,0.08)",
                            borderColor: item.status === "confirmed"
                              ? "rgba(0,201,167,0.5)"
                              : item.status === "skipped"
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(255,255,255,0.2)",
                            opacity: item.status === "skipped" ? 0.6 : 1,
                          }}
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Status indicator */}
                              <div className="flex-shrink-0 mt-1">
                                {item.status === "confirmed" ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#00c9a7] rounded-full text-white text-xs">&#10003;</span>
                                ) : item.status === "skipped" ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded-full text-white text-xs">&#8212;</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 border-2 border-white/30 rounded-full" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {item.isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={item.editedContent ?? item.content}
                                      onChange={(e) => updateReviewItem(idx, { editedContent: e.target.value })}
                                      rows={2}
                                      className="w-full px-3 py-2 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/60 bg-white/10 border border-white/30 text-sm"
                                    />
                                    {(item.type === "task" || item.type === "idea") && (
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-white/50">
                                          {item.type === "task" ? "Owner:" : "Speaker:"}
                                        </label>
                                        <select
                                          value={item.editedOwner ?? item.owner ?? ""}
                                          onChange={(e) => updateReviewItem(idx, { editedOwner: e.target.value })}
                                          className="px-2 py-1 rounded-lg text-sm bg-white/10 border border-white/30 text-white"
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
                                    <p className={`text-sm font-medium ${item.status === "skipped" ? "text-white/40 line-through" : "text-white"}`}>
                                      {item.editedContent || item.content}
                                    </p>
                                    {(item.owner || item.editedOwner) && (
                                      <p className="text-xs text-white/50 mt-1">
                                        {item.type === "task" ? "Owner" : "Speaker"}:{" "}
                                        <span className="capitalize">{item.editedOwner || item.owner}</span>
                                      </p>
                                    )}
                                    {item.confidence && (
                                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-1 ${item.confidence === "high" ? "bg-[#00c9a7]/20 text-[#00c9a7]" : "bg-amber-400/20 text-amber-300"}`}>
                                        {item.confidence} confidence
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Badge */}
                              <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${getItemBadgeColor(item.type)}`}>
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </span>
                            </div>

                            {/* Action buttons */}
                            {item.status !== "confirmed" && item.status !== "skipped" && (
                              <div className="flex items-center gap-2 mt-3 ml-8">
                                <button onClick={() => confirmItem(idx)} className="px-3 py-1.5 bg-[#00c9a7] text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity">
                                  Confirm
                                </button>
                                <button onClick={() => toggleEdit(idx)} className="px-3 py-1.5 border border-white/30 text-white text-xs font-semibold rounded-full hover:bg-white/10 transition-colors">
                                  {item.isEditing ? "Done" : "Edit"}
                                </button>
                                <button onClick={() => skipItem(idx)} className="px-3 py-1.5 text-white/40 text-xs font-semibold rounded-full hover:text-white/70 transition-colors">
                                  Skip
                                </button>
                              </div>
                            )}

                            {/* Undo */}
                            {(item.status === "confirmed" || item.status === "skipped") && (
                              <div className="mt-2 ml-8">
                                <button onClick={() => updateReviewItem(idx, { status: "pending" })} className="text-xs text-white/40 hover:text-white transition-colors">
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
              <details className="rounded-2xl border border-white/30 overflow-hidden" style={glassStyle}>
                <summary className="p-4 cursor-pointer text-sm font-medium text-white/50 hover:text-white transition-colors">
                  View Full Transcript
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-white/70 leading-relaxed whitespace-pre-wrap text-xs">
                    {transcript}
                  </p>
                </div>
              </details>

              {/* Save / Reset buttons */}
              <div className="flex flex-col gap-3">
                {reviewItems.some((i) => i.status === "confirmed") && (
                  <button
                    onClick={saveConfirmed}
                    className="w-full py-4 px-6 bg-[#00c9a7] text-white rounded-full font-bold hover:opacity-90 transition-opacity"
                  >
                    Save {reviewItems.filter((i) => i.status === "confirmed").length} Item{reviewItems.filter((i) => i.status === "confirmed").length !== 1 ? "s" : ""} to Wiki
                  </button>
                )}
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-6 border border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.15)" }}
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
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">Saving to Wiki</h1>
            <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00c9a7]" />
              <p className="text-lg text-white font-medium">Writing items to the wiki...</p>
            </div>
          </>
        )}

        {/* SAVED STATE */}
        {state === "saved" && (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-white font-bold">Meeting Complete</h1>
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#00c9a7]/40 p-6 text-center" style={{ background: "rgba(0,201,167,0.15)" }}>
                <div className="text-4xl mb-3 text-[#00c9a7]">&#10003;</div>
                <p className="text-[#00c9a7] font-bold text-lg">{saveMessage}</p>
                <p className="text-white/50 text-sm mt-2">Items committed to your GitHub wiki.</p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="w-full py-4 px-6 bg-[#00c9a7] text-white rounded-full font-bold hover:opacity-90 transition-opacity text-center"
                >
                  Back to Home
                </Link>
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-6 border border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.15)" }}
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
