'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ElementType, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { getPublicRoom, joinPublicRoom } from '@/lib/videoAuditService';
import { Button } from '@/components/ui/button';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, CheckCircle2, AlertTriangle, ShieldCheck, Clock, LockKeyhole } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const WEBRTC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_VIDEO_AUDIT_WEBRTC_MVP === 'true';

function getPublicSocketUrl(): string {
  const tunnelUrl = process.env.NEXT_PUBLIC_SOCKET_URL_TUNNEL;
  const defaultUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isCloudflare = window.location.hostname.endsWith('.trycloudflare.com');
    if ((isHttps || isCloudflare) && tunnelUrl) {
      return tunnelUrl;
    }
    return defaultUrl || window.location.origin;
  }
  return defaultUrl;
}

type CallStatus = 'idle' | 'joining' | 'waiting_peer' | 'connecting' | 'in_call' | 'ended' | 'error';

export default function VideoAuditoriaPublicPage() {
  const params = useParams();
  const token = params?.token as string;

  // Page state
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  // WebRTC state
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [callErr, setCallErr] = useState<string | null>(null);
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);
  const [cameraWarning, setCameraWarning] = useState(false);
  const [remoteCamOff, setRemoteCamOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string | null>(null);

  // Load room info
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const info = await getPublicRoom(token);
        setRoomInfo(info);
        if (info.roomStatus === 'affiliate_joined') setJoined(true);
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar la sala.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      if (socketRef.current && roomIdRef.current) {
        socketRef.current.emit('videoaudit:peer_left', { roomId: roomIdRef.current });
      }
      socketRef.current?.disconnect();
      remoteStreamRef.current = null;
    };
  }, []);

  const handleJoin = async () => {
    if (!token) return;
    try {
      setJoining(true);
      const result = await joinPublicRoom(token);
      setJoined(true);
      if (roomInfo) setRoomInfo({ ...roomInfo, roomStatus: result.roomStatus });
    } catch (err: any) {
      setError(err.message || 'No se pudo ingresar a la sala.');
    } finally {
      setJoining(false);
    }
  };

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
        localVideoRef.current.play().catch(e => console.error('[WebRTC][Affiliate] Local video play error:', e));
      }

      setHasMedia(true);
      setCameraWarning(false);
      return stream;
    } catch (err: any) {
      console.error('[WebRTC][Affiliate] getUserMedia error:', err);
      setCallErr('No se pudo acceder a cámara o micrófono. Revisá los permisos del navegador.');
      setCallStatus('error');
      return null;
    }
  }, []);

  const handleActivateCall = useCallback(async () => {
    const stream = await getLocalMedia();
    if (!stream) return;

    setCallStatus('joining');

    // Create unauthenticated public socket
    const sock = io(getPublicSocketUrl(), {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      // No auth token — public affiliate
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('videoaudit:join_call', { publicToken: token, role: 'affiliate' });
    });

    sock.on('videoaudit:joined_call', ({ roomId }: any) => {
      roomIdRef.current = roomId;
      setCallStatus('waiting_peer');
    });

    sock.on('videoaudit:peer_ready', () => {
      // Affiliate waits for auditor's offer — nothing to do here
      setCallStatus('connecting');
    });

    sock.on('videoaudit:offer', async ({ offer }: any) => {
      if (!localStreamRef.current) return;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      pendingIceRef.current = [];
      remoteStreamRef.current = null;
      setRemoteCamOff(false);
      setRemoteMuted(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      const pc = new RTCPeerConnection(STUN);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate && roomIdRef.current) {
          sock.emit('videoaudit:ice_candidate', { candidate: e.candidate.toJSON(), roomId: roomIdRef.current });
        }
      };
      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteStreamRef.current = e.streams[0];
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play()
            .then(() => setRemoteAudioBlocked(false))
            .catch(err => {
              console.error('[WebRTC][Affiliate] Remote video play error:', err);
              if (err.name === 'NotAllowedError') setRemoteAudioBlocked(true);
            });

          setCallStatus('in_call');
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setCallStatus('in_call');
        if (pc.connectionState === 'failed') {
          setCallStatus('error');
          setCallErr('No se pudo establecer la videollamada. Intentá recargar la página.');
        }
      };

      // Add local tracks
      localStreamRef.current.getTracks().forEach(t => {
        pc.addTrack(t, localStreamRef.current!);
      });

      // Apply pending ICE candidates
      for (const c of pendingIceRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
      }
      pendingIceRef.current = [];

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sock.emit('videoaudit:answer', { answer: pc.localDescription, roomId: roomIdRef.current });
      const videoEnabled = localStreamRef.current.getVideoTracks().every(t => t.enabled);
      const audioEnabled = localStreamRef.current.getAudioTracks().every(t => t.enabled);
      sock.emit('videoaudit:media_state', { roomId: roomIdRef.current, videoEnabled, audioEnabled });
    });

    sock.on('videoaudit:ice_candidate', async ({ candidate }: any) => {
      if (!candidate) return;
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      } else {
        pendingIceRef.current.push(candidate);
      }
    });

    sock.on('videoaudit:peer_left', () => {
      setCallStatus('waiting_peer');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      remoteStreamRef.current = null;
      setRemoteCamOff(false);
      setRemoteMuted(false);
    });

    sock.on('videoaudit:media_state', ({ videoEnabled, audioEnabled }: any) => {
      if (typeof videoEnabled === 'boolean') setRemoteCamOff(!videoEnabled);
      if (typeof audioEnabled === 'boolean') setRemoteMuted(!audioEnabled);
    });

    sock.on('videoaudit:call_error', ({ message }: any) => {
      setCallStatus('error');
      setCallErr(message || 'Error en la videollamada.');
    });

    sock.on('connect_error', () => {
      setCallStatus('error');
      setCallErr('No se pudo conectar al servidor. Verificá tu conexión.');
    });
  }, [token, getLocalMedia]);

  // Re-attach local stream when video grid becomes visible (element may not have existed during getLocalMedia)
  useEffect(() => {
    if (callStatus !== 'idle' && callStatus !== 'ended' && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.error('[WebRTC][Affiliate] Re-attach local play error:', e));
      }

      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack && (videoTrack.muted || videoTrack.readyState !== 'live')) {
        setCameraWarning(true);
      } else {
        setCameraWarning(false);
      }
    }

    if (callStatus === 'in_call' && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play()
          .then(() => setRemoteAudioBlocked(false))
          .catch(e => {
            console.error('[WebRTC][Affiliate] Re-attach remote play error:', e);
            if (e.name === 'NotAllowedError') setRemoteAudioBlocked(true);
          });
      }
    }
  }, [callStatus]);

  const handleLeave = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('videoaudit:peer_left', { roomId: roomIdRef.current });
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
    localStreamRef.current = null;
    pcRef.current = null;
    socketRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallStatus('ended');
    setHasMedia(false);
    setIsMuted(false);
    setIsCamOff(false);
    setRemoteCamOff(false);
    setRemoteMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    if (!audioTracks.length) return;
    const nextMuted = audioTracks.some(t => t.enabled);
    audioTracks.forEach(t => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('videoaudit:media_state', { roomId: roomIdRef.current, audioEnabled: !nextMuted });
    }
  }, []);

  const setLocalCameraEnabled = useCallback((enabled: boolean) => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) return;

    const changed = videoTracks.some(t => t.enabled !== enabled);
    videoTracks.forEach(t => { t.enabled = enabled; });
    setIsCamOff(!enabled);

    if (changed && socketRef.current && roomIdRef.current) {
      socketRef.current.emit('videoaudit:media_state', { roomId: roomIdRef.current, videoEnabled: enabled });
    }
  }, []);

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

  // ─── Render ──────────────────────────────────────────
  if (loading) {
    return (
      <PublicVideoAuditShell>
        <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/90 p-8 text-center shadow-xl shadow-emerald-900/10">
          <DannSaludBrand />
          <Loader2 className="mx-auto mt-8 h-9 w-9 animate-spin text-[#007949]" />
          <p className="mt-4 text-sm font-medium text-gray-600">Cargando sala...</p>
        </div>
      </PublicVideoAuditShell>
    );
  }

  if (error) {
    return (
      <PublicVideoAuditShell>
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white/95 p-7 text-center shadow-xl shadow-emerald-900/10">
          <DannSaludBrand />
          <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-gray-900">Sala no disponible</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">{error}</p>
        </div>
      </PublicVideoAuditShell>
    );
  }

  const firstName = roomInfo?.affiliateFirstName || '';
  const expiresText = roomInfo?.expiresAt
    ? `Este link expira: ${new Date(roomInfo.expiresAt).toLocaleString('es-AR')}`
    : null;

  // ─── Pre-join screen ──────────────────────────────────
  if (!joined) {
    return (
      <PublicVideoAuditShell>
        <div className="w-full max-w-md">
          <header className="mb-5 text-center">
            <DannSaludBrand />
          </header>

          <main className="rounded-2xl border border-white/80 bg-white/95 p-6 shadow-xl shadow-emerald-900/10 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C794] to-[#0078A0] text-white shadow-lg shadow-[#00C794]/25">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div className="mt-6 text-center">
              {firstName && <p className="text-sm font-semibold text-[#007949]">Bienvenido/a, {firstName}</p>}
              <h1 className="mt-2 text-xl font-bold text-gray-900">Videoauditoría de validación</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Confirmá tu presencia para ingresar a la sala. El auditor te acompañará durante el proceso.
              </p>
            </div>

            <Button
              onClick={handleJoin}
              disabled={joining}
              className="mt-7 h-12 w-full rounded-xl bg-gradient-to-r from-[#007949] to-[#0078A0] text-base font-semibold text-white shadow-lg shadow-[#007949]/20 transition hover:from-[#006b40] hover:to-[#006f94]"
            >
              {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Video className="mr-2 h-5 w-5" />}
              Ingresar a la videoauditoría
            </Button>

            <div className="mt-5 space-y-3">
              <PublicInfoNote icon={LockKeyhole}>
                La videollamada podrá ser grabada únicamente como respaldo de validación del trámite.
              </PublicInfoNote>
              <PublicInfoNote icon={Clock} subtle>
                {expiresText || 'El enlace es de uso temporal para esta videoauditoría.'}
              </PublicInfoNote>
            </div>
          </main>
        </div>
      </PublicVideoAuditShell>
    );
  }

  // ─── Post-join: call screen ────────────────────────────
  const callStatusLabels: Record<CallStatus, string> = {
    idle: '',
    joining: 'Conectando...',
    waiting_peer: 'Esperando al auditor...',
    connecting: 'Conectando videollamada...',
    in_call: 'En llamada',
    ended: 'Llamada finalizada',
    error: 'Error de conexión',
  };

  return (
    <PublicVideoAuditShell align="top">
      <div className="w-full max-w-2xl pb-6 pt-3 sm:pt-8">
        <header className="mb-5 text-center">
          <DannSaludBrand />
          {firstName && <p className="mt-3 text-sm text-gray-600">Bienvenido/a, <strong className="text-gray-800">{firstName}</strong></p>}
        </header>

        <main className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl shadow-emerald-900/10 sm:p-6">
          <section className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#007949] shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Ingresaste correctamente</h1>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Por favor aguardá al auditor. La videoauditoría comenzará en breve.
                </p>
              </div>
            </div>
          </section>

          {/* Call status */}
          {callStatus !== 'idle' && (
            <p className={`mt-4 text-sm font-semibold ${callStatus === 'in_call' ? 'text-[#007949]' : callStatus === 'error' ? 'text-red-600' : 'text-[#0078A0]'}`}>
              {callStatusLabels[callStatus]}
            </p>
          )}

          {/* Error */}
          {callStatus === 'error' && callErr && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{callErr}</span>
            </div>
          )}

          {cameraWarning && callStatus !== 'idle' && callStatus !== 'ended' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Tu cámara está activa, pero no está enviando imagen. Revisá si otra aplicación la está usando.</span>
            </div>
          )}

          {/* Video layout — main video + floating PiP */}
          {callStatus !== 'idle' && callStatus !== 'ended' && (
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black shadow-inner">
              {/* Main video: remote / auditor */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full bg-gray-900 object-contain"
              />
              {callStatus !== 'in_call' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/35 px-3 py-1 text-sm text-gray-200">Esperando al auditor...</span>
                </div>
              )}
              {remoteCamOff && <DannSaludVideoPlaceholder label="VIDEOAUDITORÍA ONLINE" />}
              {remoteAudioBlocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                  <Button
                    onClick={() => {
                      remoteVideoRef.current?.play().then(() => setRemoteAudioBlocked(false));
                    }}
                    className="rounded-xl bg-white text-gray-900 hover:bg-gray-100"
                  >
                    Activar audio
                  </Button>
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Auditor{remoteMuted ? ' · mic silenciado' : ''}</span>

              {/* Floating PiP: local / affiliate */}
              <div className="absolute bottom-3 right-3 h-20 w-28 overflow-hidden rounded-lg border border-white/10 bg-gray-900 shadow-lg sm:h-28 sm:w-40 md:h-36 md:w-48">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                />
                {isCamOff && <DannSaludVideoPlaceholder compact label="VIDEOAUDITORÍA ONLINE" />}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Vos</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-5 flex flex-wrap gap-2">
            {(callStatus === 'idle' || callStatus === 'ended') && WEBRTC_ENABLED && (
              <Button
                onClick={handleActivateCall}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-[#007949] to-[#0078A0] text-base font-semibold text-white shadow-lg shadow-[#007949]/20 transition hover:from-[#006b40] hover:to-[#006f94] sm:w-auto sm:px-5"
              >
                <Video className="mr-2 h-5 w-5" /> Activar cámara y micrófono
              </Button>
            )}
            {callStatus !== 'idle' && callStatus !== 'ended' && (
              <>
                {callStatus !== 'error' && (
                  <>
                    <Button size="sm" variant="outline" onClick={toggleMute} disabled={!hasMedia}
                      className={`rounded-lg ${isMuted ? 'border-red-300 text-red-600' : 'border-emerald-200 text-gray-700'}`}>
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      <span className="ml-1">{isMuted ? 'Activar mic' : 'Silenciar'}</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={toggleCam} disabled={!hasMedia}
                      className={`rounded-lg ${isCamOff ? 'border-red-300 text-red-600' : 'border-emerald-200 text-gray-700'}`}>
                      {isCamOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      <span className="ml-1">{isCamOff ? 'Encender cámara' : 'Apagar cámara'}</span>
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" onClick={handleLeave} className="gap-1 rounded-lg">
                  <PhoneOff className="h-4 w-4" /> Salir
                </Button>
              </>
            )}
          </div>

          {(callStatus === 'idle' || callStatus === 'ended') && (
            <div className="mt-5 space-y-3">
              {callStatus === 'ended' ? (
                <p className="text-sm leading-6 text-gray-600">La llamada ha finalizado. Gracias por participar.</p>
              ) : (
                <PublicInfoNote icon={Video}>
                  El navegador puede pedir permiso para usar cámara y micrófono. No necesitás descargar ninguna aplicación.
                </PublicInfoNote>
              )}
              <PublicInfoNote icon={LockKeyhole} subtle>
                La videollamada podrá ser grabada únicamente como respaldo de validación del trámite.
              </PublicInfoNote>
            </div>
          )}
        </main>

        {expiresText && (
          <p className="mx-auto mt-4 max-w-md text-center text-xs leading-5 text-gray-500">
            {expiresText}
          </p>
        )}
      </div>
    </PublicVideoAuditShell>
  );
}

function PublicVideoAuditShell({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'top' }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f0fbf6_0%,#ecf8f7_48%,#f8fafc_100%)] px-4 py-5 text-gray-900 sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(0,199,148,0.14),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(0,120,160,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
      <div className={`relative z-10 flex min-h-[calc(100vh-2.5rem)] w-full ${align === 'top' ? 'items-start justify-center' : 'items-center justify-center'}`}>
        {children}
      </div>
    </div>
  );
}

function DannSaludBrand() {
  return (
    <div className="text-center select-none">
      <div className="inline-flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C794] to-[#0078A0] text-xl font-bold text-white shadow-lg shadow-[#00C794]/25">
          +
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold leading-none tracking-normal">
            <span className="text-[#007949]">DANN</span>
            <span className="text-[#0078A0]">+</span>
            <span className="text-gray-700">SALUD</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-500">
            VIDEOAUDITORÍA ONLINE
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicInfoNote({ icon: Icon, children, subtle = false }: { icon: ElementType; children: ReactNode; subtle?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 text-left text-xs leading-5 ${subtle ? 'border-gray-100 bg-gray-50 text-gray-500' : 'border-emerald-100 bg-emerald-50/60 text-gray-600'}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${subtle ? 'text-gray-400' : 'text-[#007949]'}`} />
      <p>{children}</p>
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
