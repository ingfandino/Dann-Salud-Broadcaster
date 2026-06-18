import { API_URL } from './api';

export interface VideoAuditRoom {
  roomId: string | null;
  publicToken: string | null;
  publicUrl: string | null;
  status: 'not_created' | 'created' | 'invitation_sent' | 'affiliate_joined' | 'expired' | 'cancelled';
  createdAt: string | null;
  createdBy: string | null;
  lastInvitationSentAt: string | null;
  lastInvitationSentBy: string | null;
  affiliateJoinedAt: string | null;
  expiresAt: string | null;
}

export interface VideoAuditData {
  _id: string;
  ventaId: string;
  status: 'empty' | 'video_uploaded' | 'audio_uploaded' | 'complete';
  isLocked: boolean;
  video?: {
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
  audioBackup?: {
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
  room?: VideoAuditRoom;
}

export type VideoAuditSendStatus = "accepted" | "failed" | "not_connected" | "unavailable";

export interface VideoAuditInvitationResponse {
  ok: boolean;
  sendStatus: VideoAuditSendStatus;
  message: string;
  engine?: string;
  messageId?: string | null;
  jid?: string | null;
  room: VideoAuditRoom;
}

export const fetchVideoAudit = async (ventaId: string, token: string): Promise<VideoAuditData> => {
  const res = await fetch(`${API_URL}/video-audits/${ventaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch Video Audit data');
  return res.json();
};

export const getVideoAuditBackendBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isCloudflare = window.location.hostname.endsWith('.trycloudflare.com');
    const tunnelUrl = process.env.NEXT_PUBLIC_SOCKET_URL_TUNNEL;
    if ((isHttps || isCloudflare) && tunnelUrl) {
      return tunnelUrl;
    }
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || '';
};

export type VideoAuditUploadProgress = {
  loaded: number;
  total: number | null;
  percent: number | null;
};

export const uploadVideoAuditFile = async (
  ventaId: string,
  token: string,
  files: { video?: File | null; audioBackup?: File | null },
  replacementReason?: string,
  onProgress?: (progress: VideoAuditUploadProgress) => void
): Promise<any> => {
  if (!token) {
    throw new Error('Authentication token is missing. Please log in again.');
  }

  const formData = new FormData();
  formData.append('ventaId', ventaId);
  if (replacementReason) {
    formData.append('replacementReason', replacementReason);
  }
  if (files.video) {
    formData.append('video', files.video);
  }
  if (files.audioBackup) {
    formData.append('audioBackup', files.audioBackup);
  }

  const backendBaseUrl = getVideoAuditBackendBaseUrl();
  const uploadUrl = `${backendBaseUrl}/api/video-audits/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      const total = event.lengthComputable ? event.total : null;
      onProgress({
        loaded: event.loaded,
        total,
        percent: total ? Math.min(100, Math.round((event.loaded / total) * 100)) : null
      });
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(new Error(data.error || data.message || `Failed to upload files (${xhr.status})`));
    };

    xhr.onerror = () => {
      reject(new Error('No se pudo conectar con el servidor para subir el video. Verificá la conexión e intentá nuevamente.'));
    };

    xhr.onabort = () => {
      reject(new Error('La subida del video fue cancelada.'));
    };

    xhr.send(formData);
  });
};

export const downloadVideoUrl = (ventaId: string) => `${API_URL}/video-audits/${ventaId}/download/video`;
export const downloadAudioUrl = (ventaId: string) => `${API_URL}/video-audits/${ventaId}/download/audioBackup`;

export const downloadAuthenticatedFile = async (url: string, token: string, defaultFilename: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to download file');
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = defaultFilename;

  if (contentDisposition && contentDisposition.includes('filename=')) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length >= 2) {
      filename = filenameMatch[1];
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};

/* ========== ROOM METHODS ========== */

export const createOrGetRoom = async (ventaId: string, token: string, forceRegenerate: boolean = false): Promise<{ room: VideoAuditRoom; message: string }> => {
  const publicBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${API_URL}/video-audits/${ventaId}/room`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ publicBaseUrl, forceRegenerate })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create/get room');
  }
  return res.json();
};

export const sendRoomInvitation = async (ventaId: string, token: string): Promise<VideoAuditInvitationResponse> => {
  const res = await fetch(`${API_URL}/video-audits/${ventaId}/room/send-invitation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to send invitation';
    const error = new Error(errorMessage) as any;
    error.code = errorData.code;
    error.sendStatus = errorData.sendStatus;
    error.fallback = errorData.fallback;
    error.room = errorData.room;
    throw error;
  }
  return res.json();
};

export const getPublicRoom = async (publicToken: string): Promise<{ roomStatus: string; affiliateFirstName: string | null; organizationName: string; expiresAt: string | null }> => {
  const res = await fetch(`${API_URL}/video-audits/public/${publicToken}`, {
    method: 'GET'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch public room');
  }
  return res.json();
};

export const joinPublicRoom = async (publicToken: string): Promise<{ message: string; roomStatus: string; affiliateJoinedAt: string | null }> => {
  const res = await fetch(`${API_URL}/video-audits/public/${publicToken}/join`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to join room');
  }
  return res.json();
};
