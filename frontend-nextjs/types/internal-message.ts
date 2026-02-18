export interface InternalMessage {
    _id: string;
    from: {
        _id: string;
        nombre: string;
        email: string;
        role: string;
        numeroEquipo?: string;
    };
    to: {
        _id: string;
        nombre: string;
        email: string;
        role: string;
        numeroEquipo?: string;
    };
    subject: string;
    content: string;
    isHtml?: boolean;
    attachments: {
        _id: string;
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        path: string;
        uploadedAt: string;
    }[];
    read: boolean;
    readAt?: string;
    starred: boolean;
    archived: boolean;
    replyTo?: string | InternalMessage;
    isForward: boolean;
    forwardedFrom?: {
        _id: string;
        nombre: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface InternalMessageResponse {
    messages: InternalMessage[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
