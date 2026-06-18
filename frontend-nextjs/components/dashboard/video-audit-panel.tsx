'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchVideoAudit, uploadVideoAuditFile, downloadVideoUrl, downloadAudioUrl, downloadAuthenticatedFile, VideoAuditData, createOrGetRoom, sendRoomInvitation, VideoAuditRoom } from '@/lib/videoAuditService';
import { VideoCallPanel } from '@/components/dashboard/video-call-panel';
import { useSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { Loader2, Download, Upload, AlertTriangle, Link2, Copy, ExternalLink, Send, Video, RefreshCw, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface VideoAuditPanelProps {
  ventaId: string;
  mode?: 'full' | 'readonly';
}

export function VideoAuditPanel({ ventaId, mode = 'full' }: VideoAuditPanelProps) {
  const { user, token } = useAuth();
  const isReadOnly = mode === 'readonly';
  const [data, setData] = useState<VideoAuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [replacementReason, setReplacementReason] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomData, setRoomData] = useState<VideoAuditRoom | null>(null);

  const [copySuccess, setCopySuccess] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<{ text: string, type: 'success' | 'error' | 'loading' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [whatsappStatus, setWhatsappStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading');
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const role = user?.role?.toLowerCase() || '';
  const router = useRouter();

  const setFeedback = (msg: string, type: 'success' | 'error' | 'loading', isCopy: boolean = false) => {
    setInlineMessage({ text: msg, type });
    if (isCopy) setCopySuccess(true);

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (type !== 'loading') {
      feedbackTimeoutRef.current = setTimeout(() => {
        setInlineMessage(null);
        setCopySuccess(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const canUpload = ['gerencia', 'administrativo', 'auditor', 'supervisor', 'encargado', 'desarrollador'].includes(role);
  const canView = ['gerencia', 'administrativo', 'auditor', 'supervisor', 'recuperador', 'encargado', 'desarrollador'].includes(role);
  const canManageRoom = ['gerencia', 'administrativo', 'auditor', 'supervisor', 'encargado', 'desarrollador'].includes(role);
  const enableRoomMvp = process.env.NEXT_PUBLIC_ENABLE_VIDEO_AUDIT_ROOM_MVP === 'true';
  const enableWebrtcMvp = process.env.NEXT_PUBLIC_ENABLE_VIDEO_AUDIT_WEBRTC_MVP === 'true';

  const loadData = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      const auditData = await fetchVideoAudit(ventaId, token);
      setData(auditData);
      if (auditData.room) {
        setRoomData(auditData.room);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo cargar la información de Videoauditoría.', variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ventaId, token]);

  const checkWhatsappStatus = async () => {
    if (!token) return;
    try {
      setWhatsappStatus('loading');
      const { api } = await import('@/lib/api');
      const res = await api.whatsapp.status();
      if (res.data.connected) {
        setWhatsappStatus('connected');
        setWhatsappPhone(res.data.phoneNumber);
      } else {
        setWhatsappStatus('disconnected');
      }
    } catch (err) {
      console.error('Error fetching whatsapp status', err);
      setWhatsappStatus('error');
    }
  };

  const handleUnlinkWhatsapp = async () => {
    if (!window.confirm('¿Seguro que querés desvincular tu WhatsApp de la plataforma?')) return;
    try {
      setIsUnlinking(true);
      const { api } = await import('@/lib/api');
      await api.whatsapp.logout();
      setWhatsappStatus('disconnected');
      setWhatsappPhone(null);
      toast({ title: 'Éxito', description: 'WhatsApp desvinculado correctamente.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo desvincular WhatsApp. Intentá nuevamente.', variant: 'destructive' });
    } finally {
      setIsUnlinking(false);
    }
  };

  useEffect(() => {
    checkWhatsappStatus();
  }, [token]);

  const socket = useSocket();

  const lastToastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to specific audit room for targeted notifications
    socket.emit('audit:subscribe', ventaId);

    const handleAffiliateJoined = (payload: any) => {
      if (String(payload.ventaId) === String(ventaId)) {
        const now = Date.now();
        if (now - lastToastTimeRef.current > 10000) {
          toast({
            title: '¡Afiliado en sala!',
            description: 'El afiliado ingresó a la sala de videoauditoría. Ingresá a la videollamada cuando estés listo.',
            variant: 'default',
            className: 'bg-green-50 border-green-500 text-green-900',
            duration: 8000
          });
          lastToastTimeRef.current = now;
        }

        setRoomData(prev => {
          if (prev?.status === 'affiliate_joined') return prev;
          return { ...prev!, status: 'affiliate_joined', affiliateJoinedAt: payload.joinedAt };
        });
        setData(prev => prev && prev.room ? { ...prev, room: { ...prev.room, status: 'affiliate_joined', affiliateJoinedAt: payload.joinedAt } } : prev);
      }
    };

    socket.on('videoaudit:affiliate_joined', handleAffiliateJoined);

    return () => {
      socket.off('videoaudit:affiliate_joined', handleAffiliateJoined);
      socket.emit('audit:unsubscribe', ventaId);
    };
  }, [socket, ventaId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isPollingNeeded = roomData && roomData.status && !['affiliate_joined', 'expired', 'cancelled'].includes(roomData.status);

    if (isPollingNeeded && token) {
      interval = setInterval(async () => {
        try {
          const auditData = await fetchVideoAudit(ventaId, token);
          if (auditData.room && auditData.room.status !== roomData.status) {
            if (auditData.room.status === 'affiliate_joined' && roomData.status !== 'affiliate_joined') {
               toast({ title: 'Atención', description: 'El afiliado ingresó a la sala de videoauditoría.', variant: 'default' });
            }
            setRoomData(auditData.room);
            setData(auditData);
          }
        } catch (err) {
          console.error('Polling VideoAudit status failed', err);
        }
      }, 8000); // Poll every 8 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ventaId, token, roomData?.status]);

  const handleUpload = async () => {
    if (!token) return;
    if (!videoFile && !audioFile) {
      toast({ title: 'Atención', description: 'Debe seleccionar al menos un archivo para subir.', variant: 'default' });
      return;
    }

    // File size validations
    if (videoFile && videoFile.size > 120 * 1024 * 1024) {
      toast({ title: 'Error', description: 'El video no debe superar los 120MB.', variant: 'destructive' });
      return;
    }
    if (audioFile && audioFile.size > 120 * 1024 * 1024) {
      toast({ title: 'Error', description: 'El archivo de respaldo no debe superar los 120MB.', variant: 'destructive' });
      return;
    }

    if (data?.isLocked && !replacementReason && ['gerencia', 'desarrollador'].includes(role)) {
       toast({ title: 'Atención', description: 'Debe ingresar un motivo de reemplazo al ser un registro bloqueado.', variant: 'destructive' });
       return;
    }

    try {
      setUploading(true);
      const result = await uploadVideoAuditFile(ventaId, token, { video: videoFile, audioBackup: audioFile }, replacementReason);
      if (result.warning) {
        toast({ title: 'Éxito (con advertencia)', description: result.warning, variant: 'default' });
      } else {
        toast({ title: 'Éxito', description: 'Archivos subidos correctamente.' });
      }
      setVideoFile(null);
      setAudioFile(null);
      setReplacementReason('');
      await loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Error al subir los archivos.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (type: 'video' | 'audio', originalName: string) => {
    if (!token) return;
    try {
      setDownloading(true);
      toast({ title: 'Descargando...', description: 'El archivo se está descargando, por favor espere.', variant: 'default' });
      const url = type === 'video' ? downloadVideoUrl(ventaId) : downloadAudioUrl(ventaId);
      await downloadAuthenticatedFile(url, token, originalName);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Error al descargar el archivo.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateLink = async (forceRegenerate: boolean = false) => {
    if (!token) return;
    try {
      if (forceRegenerate) setIsRegenerating(true);
      else setIsGenerating(true);
      setFeedback(forceRegenerate ? 'Regenerando...' : 'Generando...', 'loading');

      const result = await createOrGetRoom(ventaId, token, forceRegenerate);
      setRoomData(result.room);

      const successMsg = forceRegenerate ? 'Link regenerado correctamente.' : 'Link generado correctamente.';
      setFeedback(successMsg, 'success');

      if (forceRegenerate) {
        toast({ title: 'Link regenerado', description: 'Link regenerado correctamente.', variant: 'default' });
      } else {
        toast({ title: 'Link generado', description: 'La sala de videoauditoría está lista.', variant: 'default' });
      }
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo generar el link.', 'error');
      toast({ title: 'Error', description: error.message || 'No se pudo generar el link.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
      setIsRegenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!roomData?.publicUrl) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(roomData.publicUrl);
      } else {
        // Fallback for HTTP contexts where clipboard API is unavailable
        const textarea = document.createElement('textarea');
        textarea.value = roomData.publicUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setFeedback('Link copiado al portapapeles.', 'success', true);
      toast({ title: 'Copiado', description: 'Link copiado al portapapeles.', variant: 'default' });
    } catch {
      setFeedback('No se pudo copiar automáticamente. Podés copiar el link manualmente.', 'error');
      toast({ title: 'Error', description: 'No se pudo copiar automáticamente. Seleccione y copie el link manualmente.', variant: 'destructive' });
    }
  };

  const handleOpenRoom = () => {
    if (!roomData?.publicUrl) return;
    const newWindow = window.open(roomData.publicUrl, '_blank');
    if (newWindow) {
      setFeedback('Sala abierta en una nueva pestaña.', 'success');
      toast({ title: 'Sala abierta', description: 'Sala abierta en una nueva pestaña.', variant: 'default' });
    } else {
      setFeedback('El navegador bloqueó la ventana. Copiá el link y abrilo manualmente.', 'error');
      toast({ title: 'Error', description: 'No se pudo abrir la pestaña. Verifique si tiene bloqueador de ventanas emergentes.', variant: 'destructive' });
    }
  };

  const handleSendInvitation = async () => {
    if (!token) return;
    try {
      setIsSending(true);
      setFeedback('Enviando...', 'loading');

      const result = await sendRoomInvitation(ventaId, token);
      setRoomData(result.room);

      if (result.sendStatus === 'accepted') {
        const acceptedMessage = 'Invitación enviada a WhatsApp. Si no llega en unos segundos, usá Copiar enlace.';
        setFeedback(acceptedMessage, 'success');
        toast({ title: 'WhatsApp aceptó el envío', description: acceptedMessage, variant: 'default' });
      } else {
        setFeedback('No se pudo confirmar el envío. Podés copiar el enlace y enviarlo manualmente.', 'error');
        toast({ title: 'No se pudo confirmar', description: 'Podés copiar el enlace y enviarlo manualmente.', variant: 'destructive' });
      }
    } catch (error: any) {
      if (error.room) {
        setRoomData(error.room);
      }

      const code = error.code;
      const sendStatus = error.sendStatus;

      if (code === 'WHATSAPP_NOT_CONNECTED') {
        setFeedback('Tu WhatsApp no está conectado. Vinculalo nuevamente o copiá el enlace.', 'error');
        setWhatsappStatus('disconnected');
        // Do not show a scary toast, the inline message is sufficient and friendly
      } else if (code === 'INVALID_RECIPIENT_PHONE') {
        setFeedback('La venta no tiene un teléfono válido para enviar la invitación. Copiá el enlace y envialo manualmente.', 'error');
      } else if (sendStatus === 'unavailable' || code === 'WHATSAPP_SEND_UNAVAILABLE') {
        setFeedback('El servicio de WhatsApp no está disponible para esta sesión. Copiá el enlace o reconectá WhatsApp.', 'error');
      } else {
        setFeedback('No se pudo enviar la invitación. Podés copiar el enlace y enviarlo manualmente.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const getRoomStatusLabel = (status?: string) => {
    switch (status) {
      case 'not_created': return 'Sala no creada';
      case 'created': return 'Link creado';
      case 'invitation_sent': return 'Invitación enviada';
      case 'affiliate_joined': return 'Afiliado ingresó';
      case 'expired': return 'Link expirado';
      case 'cancelled': return 'Sala cancelada';
      default: return status || 'Sala no creada';
    }
  };

  const getMultimediaStatusLabel = (status?: string) => {
    switch (status) {
      case 'empty': return 'Sin archivos cargados';
      case 'video_uploaded': return 'Video cargado';
      case 'audio_uploaded': return 'Archivo respaldatorio cargado';
      case 'complete': return 'Completo';
      default: return status || 'Sin archivos cargados';
    }
  };

  if (!canView) return <div className="p-4 text-center text-sm text-gray-500">No tiene permisos para ver esta sección.</div>;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const isLocked = data?.isLocked;
  const showUpload = canUpload && (!isLocked || ['gerencia', 'desarrollador'].includes(role));

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-muted/50">
        <h3 className="text-lg font-medium mb-4">Estado: <span className="font-bold">{getMultimediaStatusLabel(data?.status)}</span></h3>
        {isLocked && (
          <div className="flex items-center gap-2 text-amber-600 mb-4 bg-amber-50 p-2 rounded text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>Este registro de Videoauditoría está bloqueado. Solo Gerencia puede modificarlo.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded-md bg-white">
            <h4 className="font-semibold mb-2 text-sm text-gray-700">Videoauditoría</h4>
            {data?.video?.originalName ? (
              <div className="text-sm space-y-1">
                <p className="truncate" title={data.video.originalName}><strong>Archivo:</strong> {data.video.originalName}</p>
                <p><strong>Tamaño:</strong> {formatSize(data.video.size)}</p>
                <p><strong>Subido:</strong> {new Date(data.video.uploadedAt).toLocaleString()}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => handleDownload('video', data.video!.originalName)} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" /> Descargar Video
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No hay video subido.</p>
            )}
          </div>

          <div className="border p-4 rounded-md bg-white">
            <h4 className="font-semibold mb-2 text-sm text-gray-700">Archivo respaldatorio</h4>
            {data?.audioBackup?.originalName ? (
              <div className="text-sm space-y-1">
                <p className="truncate" title={data.audioBackup.originalName}><strong>Archivo:</strong> {data.audioBackup.originalName}</p>
                <p><strong>Tamaño:</strong> {formatSize(data.audioBackup.size)}</p>
                <p><strong>Subido:</strong> {new Date(data.audioBackup.uploadedAt).toLocaleString()}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => handleDownload('audio', data.audioBackup!.originalName)} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" /> Descargar Respaldo
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No hay archivo de respaldo subido.</p>
            )}
          </div>
        </div>
      </div>

      {enableRoomMvp && canManageRoom && !isReadOnly && (
        <div className="rounded-lg border p-4 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Sala de videoauditoría</h3>
          </div>

          <div className="mb-4">
            <span className="text-sm text-gray-500">Estado:</span>{' '}
            <span className="font-semibold text-sm">{getRoomStatusLabel(roomData?.status || data?.room?.status)}</span>
            {roomData?.expiresAt && (
              <span className="text-xs text-gray-400 ml-2">
                (Expira: {new Date(roomData.expiresAt).toLocaleString('es-AR')})
              </span>
            )}
          </div>

          <div className="mb-4 p-3 bg-gray-50 border rounded-md">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">WhatsApp del auditor</h4>
            {whatsappStatus === 'loading' && <p className="text-sm text-gray-500">Reconectando WhatsApp...</p>}
            {whatsappStatus === 'error' && <p className="text-sm text-red-500">Error al consultar WhatsApp</p>}
            {whatsappStatus === 'connected' && (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-green-700">
                  <span className="font-medium">WhatsApp conectado</span>
                  {whatsappPhone && <span> ({whatsappPhone})</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkWhatsapp}
                    disabled={isUnlinking}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    {isUnlinking ? 'Desvinculando...' : 'Desvincular WhatsApp'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={checkWhatsappStatus}
                    disabled={isUnlinking}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar estado
                  </Button>
                </div>
              </div>
            )}
            {whatsappStatus === 'disconnected' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 font-medium">WhatsApp no enlazado</p>
                  <p className="text-xs text-gray-500">Solo necesitás enlazarlo una vez. La sesión quedará asociada a tu usuario.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentPath = window.location.pathname + window.location.search;
                      router.push(`/dashboard/whatsapp?returnUrl=${encodeURIComponent(currentPath)}`);
                    }}
                  >
                    Enlazar WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={checkWhatsappStatus}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar estado
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!roomData?.publicToken || roomData?.status === 'expired' || roomData?.status === 'cancelled' ? (
            <div className="space-y-3">
              <Button type="button" onClick={() => handleGenerateLink(false)} disabled={isGenerating || roomLoading} variant="default" className="w-full md:w-auto">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar link'}
              </Button>
              {inlineMessage && (
                <div className={`text-sm p-2 rounded-md ${
                  inlineMessage.type === 'success' ? 'bg-green-50 text-green-700' :
                  inlineMessage.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {inlineMessage.text}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" onClick={handleCopyLink}>
                  {copySuccess ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  <span className={copySuccess ? "text-green-600 font-medium" : ""}>
                    {copySuccess ? 'Copiado ✓' : 'Copiar link'}
                  </span>
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={handleOpenRoom}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir sala
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={handleSendInvitation} disabled={isSending || roomLoading}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSending ? 'Enviando...' : 'Enviar invitación por WhatsApp'}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => handleGenerateLink(true)} disabled={isRegenerating || roomLoading}>
                  {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {isRegenerating ? 'Regenerando...' : 'Regenerar'}
                </Button>
              </div>

              {inlineMessage && (
                <div className={`text-sm p-2 rounded-md ${
                  inlineMessage.type === 'success' ? 'bg-green-50 text-green-700' :
                  inlineMessage.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {inlineMessage.text}
                </div>
              )}

              {roomData?.publicUrl && (
                <input
                  type="text"
                  readOnly
                  value={roomData.publicUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 cursor-text select-all mt-2"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Videollamada (Phase 2D) ── */}
      {enableRoomMvp && enableWebrtcMvp && canManageRoom && !isReadOnly && (
        <div className="rounded-lg border p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Video className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-medium">Videollamada</h3>
          </div>
          <VideoCallPanel ventaId={ventaId} roomId={roomData?.roomId ?? null} token={token || ''} onRecordingSaved={() => loadData(true)} />
        </div>
      )}

      {showUpload && !isReadOnly && (
        <div className="space-y-4 border p-4 rounded-lg bg-white">
          <h4 className="font-medium text-md text-gray-800">{(data?.video?.originalName || data?.audioBackup?.originalName) ? 'Reemplazar Archivos' : 'Subir Archivos'}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Video (mp4, webm, mov) - Max 120MB</Label>
              <Input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Video/Archivo respaldatorio - Max 120MB</Label>
              <Input type="file" accept="video/mp4,video/webm,video/quicktime,audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          {(data?.video?.originalName || data?.audioBackup?.originalName || isLocked) && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-gray-600">Motivo del reemplazo {isLocked ? <span className="text-red-500">(Obligatorio)</span> : '(Opcional)'}</Label>
              <Textarea
                placeholder="Indique por qué está reemplazando los archivos..."
                value={replacementReason}
                onChange={(e) => setReplacementReason(e.target.value)}
                className="resize-none"
              />
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full mt-2">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Subir Evidencia
          </Button>
        </div>
      )}
    </div>
  );
}
