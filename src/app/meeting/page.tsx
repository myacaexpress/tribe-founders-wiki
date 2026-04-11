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

    ctx.fillStyle = "rgba(0, 201, 167, 0.85)";
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

  const itemColor = (type: string): string => {
    switch (type) {
      case "task":     return "#00c9a7";
      case "decision": return "#ff6b5a";
      case "idea":     return "#b8c8b0";
      default:         return "rgba(255,255,255,0.6)";
    }
  };

  const itemBadgeStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case "task":     return { background: "rgba(0,201,167,0.15)",   color: "#00c9a7", border: "1px solid rgba(0,201,167,0.3)" };
      case "decision": return { background: "rgba(255,107,90,0.15)",  color: "#ff6b5a", border: "1px solid rgba(255,107,90,0.3)" };
      case "idea":     return { background: "rgba(184,200,176,0.15)", color: "#b8c8b0", border: "1px solid rgba(184,200,176,0.3)" };
      default:         return { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" };
    }
  };

  const BG_GRADIENT = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 20%, rgba(6,32,35,0.94) 35%, rgba(50,32,22,0.88) 55%, rgba(65,38,28,0.9) 70%, rgba(45,18,15,0.94) 85%, rgba(8,4,10,0.99) 100%)";

  const glassStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
  };

  const btnTeal: React.CSSProperties = {
    display: "block", width: "100%", padding: "16px 24px", border: "none",
    borderRadius: 50, fontSize: 16, fontWeight: 700,
    background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff",
    boxShadow: "0 4px 20px rgba(0,201,167,0.3)", cursor: "pointer",
  };

  const btnCoral: React.CSSProperties = {
    display: "block", width: "100%", padding: "16px 24px", border: "none",
    borderRadius: 50, fontSize: 16, fontWeight: 700,
    background: "linear-gradient(135deg, #ff6b5a, #ff8a65)", color: "#fff",
    boxShadow: "0 4px 20px rgba(255,107,90,0.3)", cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = {
    display: "block", width: "100%", padding: "14px 24px",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50,
    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 18px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14, color: "#fff", fontSize: 15, outline: "none",
    boxSizing: "border-box",
  };

  const spinnerStyle: React.CSSProperties = {
    width: 48, height: 48, borderRadius: "50%",
    border: "3px solid rgba(0,201,167,0.2)",
    borderTopColor: "#00c9a7",
    animation: "spin 0.8s linear infinite",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Fixed scenic background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `${BG_GRADIENT}, url('/bg-nature.jpg')`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "48px 20px 100px" }}>

        {/* Logo + back */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: "#fff" }}>Tri</span>
            <span style={{ color: "#ff6b5a" }}>Be</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            Trifecta Founders
          </div>
        </div>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
            ← Back
          </Link>
        </div>

        {/* IDLE STATE */}
        {state === "idle" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Record Meeting</div>

            {/* Meeting title input */}
            <div style={glassStyle}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>
                Meeting Title (optional)
              </div>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g., Weekly standup, Carrier meeting..."
                style={inputStyle}
              />
            </div>

            {/* Attendees */}
            <div style={glassStyle}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Attendees</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {([
                  { key: "shawn" as const,   label: "Shawn",   color: "#00c9a7" },
                  { key: "mark" as const,    label: "Mark",    color: "#ff6b5a" },
                  { key: "michael" as const, label: "Michael", color: "#b8c8b0" },
                ] as const).map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => handleAttendeeChange(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px",
                      background: attendees[key] ? `rgba(${color === "#00c9a7" ? "0,201,167" : color === "#ff6b5a" ? "255,107,90" : "184,200,176"},0.12)` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${attendees[key] ? `${color}44` : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 50, fontSize: 13, fontWeight: 500,
                      color: attendees[key] ? color : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${attendees[key] ? color : "rgba(255,255,255,0.2)"}`, background: attendees[key] ? color : "transparent", display: "inline-block" }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={startMeetingWithRecording} style={btnTeal}>
                Start Meeting + Record
              </button>
              <button onClick={startRecording} style={btnGhost}>
                Record Audio Only
              </button>
              <button onClick={generateBrief} style={{ ...btnGhost, color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                Generate Pre-Meeting Brief
              </button>
            </div>
          </>
        )}

        {/* REQUESTING STATE */}
        {state === "requesting" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 20 }}>
            <div style={spinnerStyle} />
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Requesting microphone...</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 280 }}>
              Please allow microphone access when your browser prompts you
            </div>
          </div>
        )}

        {/* RECORDING STATE */}
        {state === "recording" && (
          <>
            {/* Recording indicator */}
            <div style={{ ...glassStyle, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff6b5a", animation: "pulse 1.2s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#ff6b5a" }}>Recording</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                {formatTime(recordingTime)}
              </div>
            </div>

            {/* Waveform */}
            <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <canvas ref={canvasRef} width={300} height={70} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>

            {/* Google Meet */}
            <div style={glassStyle}>
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...btnTeal, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 12 }}
              >
                Open Google Meet
              </a>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 10 }}>
                Paste your Meet link below to share with attendees
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  placeholder="meet.google.com/xxx-xxxx-xxx"
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                {meetUrl && (
                  <button
                    onClick={copyMeetUrl}
                    style={{ padding: "0 16px", background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                  >
                    {meetUrlCopied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
              {meetUrl && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a href={getMeetShareLinks().mailto} style={{ flex: 1, padding: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>Email</a>
                  <a href={getMeetShareLinks().imessage} style={{ flex: 1, padding: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>iMessage</a>
                </div>
              )}
            </div>

            <button onClick={stopRecording} style={btnCoral}>
              End Meeting &amp; Transcribe
            </button>
          </>
        )}

        {/* PROCESSING STATE */}
        {state === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 20 }}>
            <div style={spinnerStyle} />
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>
              {processingStep === "transcribing" ? "Transcribing audio..." : "Processing transcript..."}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>This may take a moment</div>
          </div>
        )}

        {/* BRIEFING loading */}
        {state === "briefing" && !briefContent && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 20 }}>
            <div style={spinnerStyle} />
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Pulling data from the wiki...</div>
          </div>
        )}

        {/* BRIEFING content */}
        {state === "briefing" && briefContent && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Pre-Meeting Brief</div>
            <div style={glassStyle}>
              {briefContent.split("\n").map((line, i) => {
                if (line.startsWith("# "))  return <div key={i} style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{line.replace("# ", "")}</div>;
                if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 16, fontWeight: 600, color: "#00c9a7", marginTop: 16, marginBottom: 6 }}>{line.replace("## ", "")}</div>;
                if (line.startsWith("### ")) return <div key={i} style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 12, marginBottom: 4 }}>{line.replace("### ", "")}</div>;
                if (line.startsWith("- ")) return <div key={i} style={{ display: "flex", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 4, paddingLeft: 8 }}><span style={{ color: "#00c9a7" }}>•</span><span>{line.replace("- ", "")}</span></div>;
                if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
                return <div key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{line}</div>;
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => { setBriefContent(""); setState("idle"); }} style={btnTeal}>Ready — Start Recording</button>
              <button onClick={resetForm} style={btnGhost}>Back</button>
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {state === "error" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Error</div>
            <div style={{ background: "rgba(255,107,90,0.12)", border: "1px solid rgba(255,107,90,0.3)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, color: "#ff6b5a", lineHeight: 1.5 }}>{errorMessage}</div>
            </div>
            <button onClick={resetForm} style={btnTeal}>Try Again</button>
          </>
        )}

        {/* REVIEW STATE */}
        {state === "review" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Review Meeting Items</div>
            {summary && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>{summary}</div>}

            {/* Confirm All banner */}
            {reviewItems.some((i) => i.status === "pending") && (
              <div style={{ ...glassStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>
                    {reviewItems.filter((i) => i.status === "pending").length} pending
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {reviewItems.filter((i) => i.status === "confirmed").length} confirmed · {reviewItems.filter((i) => i.status === "skipped").length} skipped
                  </div>
                </div>
                <button onClick={confirmAll} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Confirm All
                </button>
              </div>
            )}

            {/* Items grouped by type */}
            {(["task", "decision", "idea", "question"] as const).map((type) => {
              const typeItems = reviewItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === type);
              if (typeItems.length === 0) return null;
              return (
                <div key={type} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12, textTransform: "capitalize" }}>
                    {type === "question" ? "Open Questions" : `${type}s`}
                  </div>
                  {typeItems.map(({ item, idx }) => (
                    <div key={idx} style={{
                      background: item.status === "confirmed" ? "rgba(0,201,167,0.12)" : item.status === "skipped" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${item.status === "confirmed" ? "rgba(0,201,167,0.4)" : item.status === "skipped" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 16, padding: 16, marginBottom: 10,
                      opacity: item.status === "skipped" ? 0.6 : 1,
                    }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: item.status === "confirmed" ? "#00c9a7" : "transparent", border: item.status === "confirmed" ? "none" : "2px solid rgba(255,255,255,0.2)", fontSize: 11, color: "#fff" }}>
                          {item.status === "confirmed" ? "✓" : item.status === "skipped" ? "–" : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.isEditing ? (
                            <div>
                              <textarea
                                value={item.editedContent ?? item.content}
                                onChange={(e) => updateReviewItem(idx, { editedContent: e.target.value })}
                                rows={2}
                                style={{ ...inputStyle, fontSize: 14, marginBottom: 8, resize: "none" }}
                              />
                              {(item.type === "task" || item.type === "idea") && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.type === "task" ? "Owner:" : "Speaker:"}</span>
                                  <select
                                    value={item.editedOwner ?? item.owner ?? ""}
                                    onChange={(e) => updateReviewItem(idx, { editedOwner: e.target.value })}
                                    style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 13 }}
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
                              <div style={{ fontSize: 14, fontWeight: 500, color: item.status === "skipped" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)", textDecoration: item.status === "skipped" ? "line-through" : "none" }}>
                                {item.editedContent || item.content}
                              </div>
                              {(item.owner || item.editedOwner) && (
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                                  {item.type === "task" ? "Owner" : "Speaker"}: <span style={{ textTransform: "capitalize" }}>{item.editedOwner || item.owner}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <span style={{ ...itemBadgeStyle(item.type), fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, flexShrink: 0, textTransform: "capitalize" }}>
                          {item.type}
                        </span>
                      </div>
                      {item.status !== "confirmed" && item.status !== "skipped" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12, paddingLeft: 32 }}>
                          <button onClick={() => confirmItem(idx)} style={{ padding: "6px 14px", background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", border: "none", borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                          <button onClick={() => toggleEdit(idx)} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{item.isEditing ? "Done" : "Edit"}</button>
                          <button onClick={() => skipItem(idx)} style={{ padding: "6px 14px", background: "transparent", color: "rgba(255,255,255,0.35)", border: "none", borderRadius: 50, fontSize: 12, cursor: "pointer" }}>Skip</button>
                        </div>
                      )}
                      {(item.status === "confirmed" || item.status === "skipped") && (
                        <button onClick={() => updateReviewItem(idx, { status: "pending" })} style={{ marginTop: 8, marginLeft: 32, background: "none", border: "none", fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>Undo</button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Transcript */}
            <details style={{ ...glassStyle, overflow: "hidden" }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.45)", padding: 4 }}>View Full Transcript</summary>
              <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{transcript}</div>
            </details>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviewItems.some((i) => i.status === "confirmed") && (
                <button onClick={saveConfirmed} style={btnTeal}>
                  Save {reviewItems.filter((i) => i.status === "confirmed").length} Item{reviewItems.filter((i) => i.status === "confirmed").length !== 1 ? "s" : ""} to Wiki
                </button>
              )}
              <button onClick={resetForm} style={btnGhost}>Discard &amp; Start Over</button>
            </div>
          </>
        )}

        {/* SAVING STATE */}
        {state === "saving" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 20 }}>
            <div style={spinnerStyle} />
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Writing items to the wiki...</div>
          </div>
        )}

        {/* SAVED STATE */}
        {state === "saved" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Meeting Complete</div>
            <div style={{ background: "rgba(0,201,167,0.12)", border: "1px solid rgba(0,201,167,0.3)", borderRadius: 20, padding: 32, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 40, color: "#00c9a7", marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#00c9a7", marginBottom: 6 }}>{saveMessage}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Items committed to your GitHub wiki.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/" style={{ ...btnTeal, textAlign: "center", textDecoration: "none" }}>Back to Home</Link>
              <button onClick={resetForm} style={btnGhost}>Record Another Meeting</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
