'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Video, VideoOff, Mic, MicOff, PhoneOff, AlertTriangle, Circle, Download, Loader2, RotateCcw } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { uploadVideoAuditFile } from '@/lib/videoAuditService';
import type { VideoAuditUploadProgress } from '@/lib/videoAuditService';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

type CallStatus = 'idle' | 'joining' | 'waiting_peer' | 'connecting' | 'in_call' | 'ended' | 'error';

interface VideoCallPanelProps {
  ventaId: string;
  roomId: string | null;
  token: string;
  onRecordingSaved?: () => void;
}

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'uploading' | 'saved' | 'error';

const RECORDING_MAX_DURATION = 600; // 10 minutes in seconds
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

const enableRecordingMvp = process.env.NEXT_PUBLIC_ENABLE_VIDEO_AUDIT_RECORDING_MVP === 'true';

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4'
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VideoCallPanel({ ventaId, roomId, token, onRecordingSaved }: VideoCallPanelProps) {
  const socket = useSocket();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [joinedSignaling, setJoinedSignaling] = useState(false);
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);
  const [cameraWarning, setCameraWarning] = useState(false);
  const [remoteCamOff, setRemoteCamOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  // Recording state
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingBlobType, setRecordingBlobType] = useState('video/webm');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
  const currentRoomIdRef = useRef<string | null>(null);

  // Recording refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const drawFrameRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const discardNextRecordingRef = useRef(false);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingIceRef.current = [];
    offerSentRef.current = false;
    setRemoteCamOff(false);
    setRemoteMuted(false);
  }, []);

  function drawDannSaludPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label?: string
  ) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, w, h);

    const cx = x + w / 2;
    const cy = y + h / 2;
    const logoSize = Math.max(20, Math.floor(w * 0.085));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${logoSize}px sans-serif`;

    const gap = Math.max(4, logoSize * 0.22);
    const dann = 'DANN';
    const plus = '+';
    const salud = 'SALUD';
    const dannW = ctx.measureText(dann).width;
    const plusW = ctx.measureText(plus).width;
    const saludW = ctx.measureText(salud).width;
    const totalW = dannW + plusW + saludW + gap * 2;
    let cursor = cx - totalW / 2;

    ctx.fillStyle = '#16a34a';
    ctx.fillText(dann, cursor + dannW / 2, cy - logoSize * 0.2);
    cursor += dannW + gap;
    ctx.fillStyle = '#0891b2';
    ctx.fillText(plus, cursor + plusW / 2, cy - logoSize * 0.2);
    cursor += plusW + gap;
    ctx.fillStyle = '#374151';
    ctx.fillText(salud, cursor + saludW / 2, cy - logoSize * 0.2);

    ctx.font = `600 ${Math.max(10, Math.floor(logoSize * 0.38))}px sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(label || 'VIDEOAUDITORÍA ONLINE', cx, cy + logoSize * 0.8);
  }

  const getLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.error('[WebRTC][Auditor] Local video play error:', e));
      }

      setHasMedia(true);
      setCameraWarning(false);
      return stream;
    } catch (err: any) {
      console.error('[WebRTC][Auditor] getUserMedia error:', err);
      setErrMsg('No se pudo acceder a cámara o micrófono. Revisá los permisos del navegador.');
      setStatus('error');
      return null;
    }
  }, []);

  const createPC = useCallback((): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && currentRoomIdRef.current) {
        socket.emit('videoaudit:ice_candidate', { candidate: e.candidate.toJSON(), roomId: currentRoomIdRef.current });
      }
    };
    pc.ontrack = (e) => {
        if (e.streams[0]) {
        remoteStreamRef.current = e.streams[0];

        if (audioCtxRef.current && destinationRef.current) {
          if (remoteAudioSourceRef.current) {
            try { remoteAudioSourceRef.current.disconnect(); } catch { }
            remoteAudioSourceRef.current = null;
          }
          try {
            e.streams[0].getAudioTracks().forEach((track) => {
              const srcStream = new MediaStream([track]);
              const source = audioCtxRef.current!.createMediaStreamSource(srcStream);
              source.connect(destinationRef.current!);
              remoteAudioSourceRef.current = source;
            });
          } catch (err) {
            console.error('[WebRTC][Auditor] Failed to connect new remote audio to recording:', err);
          }
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play()
            .then(() => setRemoteAudioBlocked(false))
            .catch(err => {
              console.error('[WebRTC][Auditor] Remote video play error:', err);
              if (err.name === 'NotAllowedError') setRemoteAudioBlocked(true);
            });
        }

        setStatus('in_call');
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('in_call');
      if (pc.connectionState === 'failed') {
        setStatus('error');
        setErrMsg('No se pudo establecer la videollamada. Podés continuar con el método manual.');
      }
    };
    return pc;
  }, [socket]);

  /* ========== RECORDING HELPERS ========== */

  function drawVideoContain(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = w / h;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (videoRatio > containerRatio) {
      // Video is wider → fit width, pillarbox (black bars top/bottom)
      drawW = w;
      drawH = w / videoRatio;
      drawX = x;
      drawY = y + (h - drawH) / 2;
    } else {
      // Video is taller → fit height, letterbox (black bars left/right)
      drawH = h;
      drawW = h * videoRatio;
      drawX = x + (w - drawW) / 2;
      drawY = y;
    }

    ctx.drawImage(video, drawX, drawY, drawW, drawH);
  }

  const drawRecordingFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Main video (remote / affiliate) — contain mode to preserve aspect ratio
    if (!remoteCamOff && remoteVideoRef.current && remoteVideoRef.current.readyState >= 2 && remoteVideoRef.current.videoWidth > 0) {
      drawVideoContain(ctx, remoteVideoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      drawDannSaludPlaceholder(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // PiP (local / auditor) — contain mode with rounded rect background
    const pipW = 320;
    const pipH = 240;
    const pipX = CANVAS_WIDTH - pipW - 16;
    const pipY = CANVAS_HEIGHT - pipH - 16;

    // PiP background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8, 8);
    ctx.fill();

    if (!isCamOff && localVideoRef.current && localVideoRef.current.readyState >= 2 && localVideoRef.current.videoWidth > 0) {
      drawVideoContain(ctx, localVideoRef.current, pipX, pipY, pipW, pipH);
    } else {
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 6);
      ctx.save();
      ctx.clip();
      drawDannSaludPlaceholder(ctx, pipX, pipY, pipW, pipH);
      ctx.restore();
    }
  }, [isCamOff, remoteCamOff]);

  const startDrawingLoop = useCallback(() => {
    const loop = () => {
      drawRecordingFrame();
      drawFrameRef.current = requestAnimationFrame(loop);
    };
    drawFrameRef.current = requestAnimationFrame(loop);
  }, [drawRecordingFrame]);

  const stopDrawingLoop = useCallback(() => {
    if (drawFrameRef.current) {
      cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = 0;
    }
  }, []);

  const cleanupRecordingResources = useCallback((options: { clearChunks?: boolean } = {}) => {
    const { clearChunks = true } = options;

    stopDrawingLoop();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    localAudioSourceRef.current?.disconnect();
    remoteAudioSourceRef.current?.disconnect();
    localAudioSourceRef.current = null;
    remoteAudioSourceRef.current = null;

    destinationRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
    }
    audioCtxRef.current = null;

    if (clearChunks) {
      recordedChunksRef.current = [];
    }
  }, [stopDrawingLoop]);

  const resetRecordingState = useCallback((options: { clearDiscardFlag?: boolean } = {}) => {
    const { clearDiscardFlag = false } = options;
    cleanupRecordingResources({ clearChunks: true });
    if (clearDiscardFlag) {
      discardNextRecordingRef.current = false;
    }
    mediaRecorderRef.current = null;
    setRecordingBlob(null);
    setRecordingBlobType('video/webm');
    setUploadProgress(null);
    setRecordingStatus('idle');
    setRecordingDuration(0);
    setRecordingError(null);
  }, [cleanupRecordingResources]);

  const startRecording = useCallback(async () => {
    if (!enableRecordingMvp) return;
    if (typeof MediaRecorder === 'undefined' || !getSupportedMimeType()) {
      setRecordingError('Este navegador no permite grabar la videollamada. Usá el método manual.');
      setRecordingStatus('error');
      return;
    }
    if (!localStreamRef.current || !remoteStreamRef.current) {
      setRecordingError('No hay streams disponibles para grabar. Esperá a que el afiliado se conecte.');
      setRecordingStatus('error');
      return;
    }

    setRecordingError(null);
    setRecordingBlob(null);
    setRecordingBlobType('video/webm');
    setUploadProgress(null);
    recordedChunksRef.current = [];

    // Setup canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Start drawing loop
    startDrawingLoop();

    // Capture canvas stream
    const canvasStream = canvas.captureStream(25);

    // Setup audio mixing
    let audioCtx: AudioContext | null = null;
    let destination: MediaStreamAudioDestinationNode | null = null;
    try {
      audioCtx = new AudioContext();
      destination = audioCtx.createMediaStreamDestination();

      // Local audio
      if (localStreamRef.current && destination) {
        const dest = destination;
        localStreamRef.current.getAudioTracks().forEach((track) => {
          if (!audioCtx) return;
          const srcStream = new MediaStream([track]);
          const source = audioCtx.createMediaStreamSource(srcStream);
          source.connect(dest);
          localAudioSourceRef.current = source;
        });
      }

      // Remote audio
      if (remoteStreamRef.current && destination) {
        const dest = destination;
        remoteStreamRef.current.getAudioTracks().forEach((track) => {
          if (!audioCtx) return;
          const srcStream = new MediaStream([track]);
          const source = audioCtx.createMediaStreamSource(srcStream);
          source.connect(dest);
          remoteAudioSourceRef.current = source;
        });
      }

      audioCtxRef.current = audioCtx;
      destinationRef.current = destination;
    } catch (audioErr) {
      console.warn('[Recording] AudioContext failed, recording video-only:', audioErr);
    }

    // Build final stream
    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));
    if (destination && destination.stream.getAudioTracks().length > 0) {
      destination.stream.getAudioTracks().forEach((t) => finalStream.addTrack(t));
    }

    const mimeType = getSupportedMimeType();
    const options: MediaRecorderOptions = {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000
    };

    const recorder = new MediaRecorder(finalStream, options);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      stopDrawingLoop();
      const shouldDiscard = discardNextRecordingRef.current;
      discardNextRecordingRef.current = false;
      mediaRecorderRef.current = null;

      if (shouldDiscard) {
        resetRecordingState({ clearDiscardFlag: true });
        return;
      }

      const chunks = recordedChunksRef.current.slice();
      const blobType = (mimeType.split(';')[0]) || 'video/webm';
      const blob = new Blob(chunks, { type: blobType });
      setRecordingBlob(blob);
      setRecordingBlobType(blobType);
      setRecordingStatus('processing');
      cleanupRecordingResources({ clearChunks: true });
      // Auto-upload
      uploadRecording(blob, blobType);
    };

    recorder.onerror = (e) => {
      console.error('[Recording] MediaRecorder error:', e);
      mediaRecorderRef.current = null;
      cleanupRecordingResources({ clearChunks: true });
      setRecordingError('Error durante la grabación.');
      setRecordingStatus('error');
    };

    recorder.start(1000);
    setRecordingStatus('recording');
    setRecordingDuration(0);

    // Timer
    recordingTimerRef.current = setInterval(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        setRecordingDuration(prev => {
          const next = prev + 1;
          if (next >= RECORDING_MAX_DURATION) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
            }
            cleanupRecordingResources({ clearChunks: false });
            setRecordingError('Se alcanzó la duración máxima de grabación.');
          }
          return next;
        });
      }
    }, 1000);
  }, [startDrawingLoop, stopDrawingLoop, cleanupRecordingResources, resetRecordingState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopDrawingLoop();
  }, [stopDrawingLoop]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.pause(); } catch { /* ignore */ }
      setRecordingStatus('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch { /* ignore */ }
      setRecordingStatus('recording');
    }
  }, []);

  const discardCurrentRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    let stopRequested = false;
    discardNextRecordingRef.current = true;

    try {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
          stopRequested = true;
        } catch (err) {
          console.warn('[Recording] Discard stop failed; forcing reset:', err);
          discardNextRecordingRef.current = false;
        }
      } else {
        discardNextRecordingRef.current = false;
      }
    } catch (err) {
      console.warn('[Recording] Discard reset failed; forcing UI recovery:', err);
      discardNextRecordingRef.current = false;
    } finally {
      resetRecordingState({ clearDiscardFlag: !stopRequested });
    }
  }, [resetRecordingState]);

  const cancelRecording = useCallback(() => {
    discardCurrentRecording();
  }, [discardCurrentRecording]);

  const restartRecording = useCallback(() => {
    setRestartConfirmOpen(false);
    discardCurrentRecording();
  }, [discardCurrentRecording]);

  const uploadRecording = useCallback(async (blob: Blob, blobType: string) => {
    setRecordingError(null);
    setUploadProgress(0);
    setRecordingStatus('uploading');
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `VideoAudit_Recording_${ventaId}_${timestamp}.${ext}`;
      const file = new File([blob], filename, { type: blobType || 'video/webm' });
      const result = await uploadVideoAuditFile(
        ventaId,
        token,
        { video: file },
        undefined,
        (progress: VideoAuditUploadProgress) => {
          if (typeof progress.percent === 'number') {
            setUploadProgress(progress.percent);
          }
        }
      );
      setUploadProgress(100);
      setRecordingStatus('saved');
      if (result?.warning) {
        setRecordingError(result.warning);
      }
      onRecordingSaved?.();
    } catch (err: any) {
      console.error('[Recording] Upload failed:', err);
      setRecordingStatus('error');
      setRecordingError(err.message || 'No se pudo subir la grabación. Descargala localmente para no perderla.');
    }
  }, [ventaId, token, onRecordingSaved]);

  const retryRecordingUpload = useCallback(() => {
    if (!recordingBlob) {
      setRecordingError('No hay una grabación disponible para reintentar. Deberás repetir la grabación.');
      setRecordingStatus('error');
      return;
    }
    uploadRecording(recordingBlob, recordingBlobType);
  }, [recordingBlob, recordingBlobType, uploadRecording]);

  const downloadRecording = useCallback(() => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `VideoAudit_Recording_${ventaId}_${timestamp}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [recordingBlob, ventaId]);

  const handleActivate = useCallback(async () => {
    if (!socket || !roomId) return;
    currentRoomIdRef.current = roomId;

    const stream = await getLocalMedia();
    if (!stream) return;

    if (!joinedSignaling) {
      setStatus('joining');
      socket.emit('videoaudit:join_call', { ventaId, role: 'auditor' });
      setJoinedSignaling(true);
    }
    setStatus('waiting_peer');
  }, [socket, roomId, ventaId, joinedSignaling, getLocalMedia]);

  const handleEndCall = useCallback(() => {
    // If recording, stop it gracefully first (recorder.onstop will handle upload).
    // Call ending must remain available even if recorder state is stale.
    let recorderStoppingForUpload = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        recorderStoppingForUpload = true;
      } catch (err) {
        console.warn('[Recording] Stop on call end failed; continuing call cleanup:', err);
        mediaRecorderRef.current = null;
        resetRecordingState({ clearDiscardFlag: true });
      }
      cleanupRecordingResources({ clearChunks: false });
    }
    if (socket && currentRoomIdRef.current) {
      socket.emit('videoaudit:peer_left', { roomId: currentRoomIdRef.current });
    }
    cleanup();
    cleanupRecordingResources({ clearChunks: !recorderStoppingForUpload });
    setStatus('ended');
    setHasMedia(false);
    setJoinedSignaling(false);
    setIsMuted(false);
    setIsCamOff(false);
    setErrMsg(null);
    currentRoomIdRef.current = null;
  }, [socket, cleanup, cleanupRecordingResources, resetRecordingState]);

  const toggleMute = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    if (!audioTracks.length) return;
    const nextMuted = audioTracks.some(t => t.enabled);
    audioTracks.forEach(t => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);
    if (socket && currentRoomIdRef.current) {
      socket.emit('videoaudit:media_state', { roomId: currentRoomIdRef.current, audioEnabled: !nextMuted });
    }
  }, [socket]);

  const setLocalCameraEnabled = useCallback((enabled: boolean) => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) return;

    const changed = videoTracks.some(t => t.enabled !== enabled);
    videoTracks.forEach(t => { t.enabled = enabled; });
    setIsCamOff(!enabled);

    if (changed && socket && currentRoomIdRef.current) {
      socket.emit('videoaudit:media_state', { roomId: currentRoomIdRef.current, videoEnabled: enabled });
    }
  }, [socket]);

  const toggleCam = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) return;
    const nextEnabled = !videoTracks.some(t => t.enabled);
    setLocalCameraEnabled(nextEnabled);
  }, [setLocalCameraEnabled]);

  useEffect(() => {
    const turnCameraOffForBackground = () => {
      setLocalCameraEnabled(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        turnCameraOffForBackground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', turnCameraOffForBackground);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', turnCameraOffForBackground);
    };
  }, [setLocalCameraEnabled]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const onPeerReady = async () => {
      if (!localStreamRef.current) return;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      pendingIceRef.current = [];
      offerSentRef.current = false;
      remoteStreamRef.current = null;
      setRemoteCamOff(false);
      setRemoteMuted(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      setStatus('connecting');
      const pc = createPC();
      localStreamRef.current.getTracks().forEach(t => {
        pc.addTrack(t, localStreamRef.current!);
      });
      try {
        offerSentRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('videoaudit:offer', { offer: pc.localDescription, roomId: currentRoomIdRef.current });
        const videoEnabled = localStreamRef.current.getVideoTracks().every(t => t.enabled);
        const audioEnabled = localStreamRef.current.getAudioTracks().every(t => t.enabled);
        socket.emit('videoaudit:media_state', { roomId: currentRoomIdRef.current, videoEnabled, audioEnabled });
      } catch (err) {
        console.error('[WebRTC] offer error', err);
        setStatus('error');
        setErrMsg('Error al iniciar la videollamada.');
        offerSentRef.current = false;
      }
    };

    const onAnswer = async ({ answer }: any) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingIceRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
        }
        pendingIceRef.current = [];
      } catch (err) { console.error('[WebRTC] setRemoteDesc(answer)', err); }
    };

    const onIce = async ({ candidate }: any) => {
      if (!candidate) return;
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    const onPeerLeft = () => {
      setStatus('waiting_peer');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      remoteStreamRef.current = null;
      setRemoteCamOff(false);
      setRemoteMuted(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.pause(); } catch { /* ignore */ }
        setRecordingStatus('paused');
      }
    };

    const onCallError = ({ message }: any) => {
      setStatus('error');
      setErrMsg(message || 'Error en la videollamada.');
    };

    const onMediaState = ({ videoEnabled, audioEnabled }: any) => {
      if (typeof videoEnabled === 'boolean') setRemoteCamOff(!videoEnabled);
      if (typeof audioEnabled === 'boolean') setRemoteMuted(!audioEnabled);
    };

    socket.on('videoaudit:peer_ready', onPeerReady);
    socket.on('videoaudit:answer', onAnswer);
    socket.on('videoaudit:ice_candidate', onIce);
    socket.on('videoaudit:peer_left', onPeerLeft);
    socket.on('videoaudit:call_error', onCallError);
    socket.on('videoaudit:media_state', onMediaState);

    return () => {
      socket.off('videoaudit:peer_ready', onPeerReady);
      socket.off('videoaudit:answer', onAnswer);
      socket.off('videoaudit:ice_candidate', onIce);
      socket.off('videoaudit:peer_left', onPeerLeft);
      socket.off('videoaudit:call_error', onCallError);
      socket.off('videoaudit:media_state', onMediaState);
    };
  }, [socket, createPC]);

  // Re-attach local stream when video grid becomes visible (element may not have existed during getLocalMedia)
  useEffect(() => {
    if (status !== 'idle' && status !== 'ended' && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.error('[WebRTC][Auditor] Re-attach local play error:', e));
      }

      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack && (videoTrack.muted || videoTrack.readyState !== 'live')) {
        setCameraWarning(true);
      } else {
        setCameraWarning(false);
      }
    }

    if (status === 'in_call' && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play()
          .then(() => setRemoteAudioBlocked(false))
          .catch(e => {
            console.error('[WebRTC][Auditor] Re-attach remote play error:', e);
            if (e.name === 'NotAllowedError') setRemoteAudioBlocked(true);
          });
      }
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket && currentRoomIdRef.current) {
        socket.emit('videoaudit:peer_left', { roomId: currentRoomIdRef.current });
      }
      // If recording is in progress, discard it on unmount; do not upload a partial recording.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        discardNextRecordingRef.current = true;
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      resetRecordingState({ clearDiscardFlag: false });
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabels: Record<CallStatus, string> = {
    idle: '',
    joining: 'Iniciando...',
    waiting_peer: 'Esperando afiliado...',
    connecting: 'Conectando videollamada...',
    in_call: 'En llamada',
    ended: 'Llamada finalizada',
    error: 'Error de conexión',
  };

  const hasPersistentUploadState = ['processing', 'uploading', 'saved', 'error'].includes(recordingStatus);
  const showRecordingControls = enableRecordingMvp && status !== 'idle' && (status !== 'ended' || hasPersistentUploadState);
  const progressValue = recordingStatus === 'saved' ? 100 : Math.max(0, Math.min(100, uploadProgress ?? 0));

  if (!roomId) {
    return <p className="text-sm text-gray-500 italic">Generá el link primero para habilitar la videollamada.</p>;
  }

  return (
    <div className="space-y-3">
      {status !== 'idle' && (
        <p className={`text-sm font-medium ${status === 'in_call' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
          {statusLabels[status]}
        </p>
      )}

      {status === 'error' && errMsg && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errMsg}</span>
        </div>
      )}

      {cameraWarning && status !== 'idle' && status !== 'ended' && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>La cámara está activa, pero no está enviando imagen. Revisá si otra aplicación la está usando.</span>
        </div>
      )}

      {/* Hidden canvas for recording composition */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video layout — main video + floating PiP */}
      {status !== 'idle' && status !== 'ended' && (
        <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
          {/* Main video: remote / affiliate */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-gray-900"
          />
          {status !== 'in_call' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Esperando afiliado...</span>
            </div>
          )}
          {remoteCamOff && <DannSaludVideoPlaceholder label="VIDEOAUDITORÍA ONLINE" />}
          {remoteAudioBlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Button onClick={() => {
                remoteVideoRef.current?.play().then(() => setRemoteAudioBlocked(false));
              }}>
                Activar audio
              </Button>
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Afiliado{remoteMuted ? ' · mic silenciado' : ''}</span>

          {/* Floating PiP: local / auditor */}
          <div className="absolute bottom-3 right-3 w-32 h-24 md:w-48 md:h-36 bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-white/10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {isCamOff && <DannSaludVideoPlaceholder compact label="VIDEOAUDITORÍA ONLINE" />}
            <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded">Vos</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {(status === 'idle' || status === 'ended') && (
          <Button size="sm" onClick={handleActivate} className="gap-1">
            <Video className="h-4 w-4" /> Activar cámara y micrófono
          </Button>
        )}
        {status !== 'idle' && status !== 'ended' && (
          <>
            {status !== 'error' && (
              <>
                <Button size="sm" variant="outline" onClick={toggleMute} disabled={!hasMedia}
                  className={isMuted ? 'border-red-300 text-red-600' : ''}>
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="ml-1">{isMuted ? 'Activar mic' : 'Silenciar'}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={toggleCam} disabled={!hasMedia}
                  className={isCamOff ? 'border-red-300 text-red-600' : ''}>
                  {isCamOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  <span className="ml-1">{isCamOff ? 'Encender cámara' : 'Apagar cámara'}</span>
                </Button>
              </>
            )}
            <Button size="sm" variant="destructive" onClick={handleEndCall} className="gap-1">
              <PhoneOff className="h-4 w-4" /> Finalizar llamada
            </Button>
            {status === 'error' && (
              <Button size="sm" variant="outline" onClick={() => { cleanup(); setStatus('idle'); setHasMedia(false); setJoinedSignaling(false); setErrMsg(null); offerSentRef.current = false; }}>
                Reintentar
              </Button>
            )}
          </>
        )}
      </div>

      {/* Recording controls — auditor side only */}
      {showRecordingControls && (
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <Circle className={`h-3 w-3 fill-current ${recordingStatus === 'recording' ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} />
            <span className="text-sm font-medium">Grabación</span>
            {recordingStatus === 'recording' && (
              <span className="text-sm font-mono text-red-600">{formatDuration(recordingDuration)}</span>
            )}
          </div>

          {recordingStatus === 'idle' && (
            <Button
              size="sm"
              variant="outline"
              onClick={startRecording}
              disabled={!hasMedia || !remoteStreamRef.current || status !== 'in_call'}
            >
              Iniciar grabación
            </Button>
          )}

          {recordingStatus === 'recording' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={pauseRecording}>
                Pausar grabación
              </Button>
              <Button size="sm" variant="destructive" onClick={stopRecording}>
                Detener grabación
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelRecording}>
                Cancelar grabación
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRestartConfirmOpen(true)} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reiniciar grabación
              </Button>
            </div>
          )}

          {recordingStatus === 'paused' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={resumeRecording} disabled={!remoteStreamRef.current || status !== 'in_call'}>
                Reanudar grabación
              </Button>
              <Button size="sm" variant="destructive" onClick={stopRecording}>
                Detener grabación
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelRecording}>
                Cancelar grabación
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRestartConfirmOpen(true)} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reiniciar grabación
              </Button>
            </div>
          )}

          {recordingStatus === 'processing' && (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando video...
              </div>
              <UploadProgressBar value={progressValue} />
            </div>
          )}

          {recordingStatus === 'uploading' && (
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progressValue >= 100 ? 'Procesando guardado...' : `Subiendo video... ${progressValue}%`}
              </div>
              <UploadProgressBar value={progressValue} />
            </div>
          )}

          {recordingStatus === 'saved' && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 font-medium">Video guardado correctamente.</p>
              <UploadProgressBar value={100} />
              {recordingError && <p className="text-xs text-amber-700">{recordingError}</p>}
            </div>
          )}

          {recordingStatus === 'error' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Error al subir el video</p>
              <p className="text-sm text-red-600">{recordingError}</p>
              <UploadProgressBar value={progressValue} failed />
              <div className="flex flex-wrap gap-2">
                {recordingBlob && (
                  <Button size="sm" variant="outline" onClick={retryRecordingUpload} className="gap-1">
                    <RotateCcw className="h-4 w-4" /> Reintentar subida
                  </Button>
                )}
                {recordingBlob && (
                  <Button size="sm" variant="outline" onClick={downloadRecording} className="gap-1">
                    <Download className="h-4 w-4" /> Descargar grabación local
                  </Button>
                )}
              </div>
              {!recordingBlob && (
                <p className="text-xs text-gray-500">La grabación no está disponible en memoria. Deberás repetirla para guardarla.</p>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'idle' && (
        <p className="text-xs text-gray-500">La auditoría podrá ser grabada únicamente cuando el auditor lo indique.</p>
      )}

      <AlertDialog open={restartConfirmOpen} onOpenChange={setRestartConfirmOpen}>
        <AlertDialogContent className="z-[10001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar grabación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres reiniciar la grabación? Se descartará todo lo grabado hasta ahora y deberás comenzar nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={restartRecording}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Sí, reiniciar grabación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadProgressBar({ value, failed = false }: { value: number; failed?: boolean }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full transition-all duration-300 ${failed ? 'bg-red-500' : 'bg-gradient-to-r from-green-600 to-cyan-600'}`}
        style={{ width }}
      />
    </div>
  );
}

function DannSaludVideoPlaceholder({ compact = false, label }: { compact?: boolean; label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
      <div className="text-center select-none">
        <div className={`font-bold tracking-normal ${compact ? 'text-sm' : 'text-2xl md:text-4xl'}`}>
          <span className="text-green-600">DANN</span>
          <span className="text-cyan-600">+</span>
          <span className="text-gray-700">SALUD</span>
        </div>
        {!compact && (
          <div className="mt-2 text-xs font-semibold text-slate-500">{label || 'VIDEOAUDITORÍA ONLINE'}</div>
        )}
      </div>
    </div>
  );
}
