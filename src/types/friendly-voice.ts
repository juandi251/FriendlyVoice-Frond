export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string; // Generated or uploaded abstract avatar
  interests?: string[];
  personalityTags?: string[];
  bio?: string; // Added bio field
  bioSoundUrl?: string; // URL to a short audio biography
  voiceSamples?: VoiceSample[];
  followers?: string[]; // User IDs
  following?: string[]; // User IDs
}

export interface VoiceSample {
  id: string;
  url: string;
  title?: string;
  createdAt: string;
}

export interface Ecosystem {
  id:string;
  name: string;
  topic: string;
  description?: string;
  tags: string[];
  hostIds: string[];
  coHostIds?: string[];
  speakerIds?: string[];
  listenerIds?: string[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  participantCount?: number; // Denormalized for quick display
}

export interface Message {
  id: string;
  chatId: string; // Identificador de la conversación, ej: sortedUserIds.join('_')
  senderId: string;
  recipientId: string; // ID del destinatario del mensaje
  voiceUrl: string; // Data URI de la grabación de voz
  createdAt: string; // ISO date string
  isRead?: boolean;
}

export interface Chat {
  id: string; // Identificador único del chat, ej: sortedUserIds.join('_')
  participantIds: string[]; // IDs de los usuarios en el chat
  otherUserName: string; // Nombre del otro usuario para mostrar en la lista de chats
  otherUserAvatar?: string; // Avatar del otro usuario
  lastMessage?: Message; // El último mensaje de la conversación
  updatedAt: string; // Fecha del último mensaje, para ordenar
  unreadCount?: number; // Número de mensajes no leídos para el usuario actual
}

// For AI Avatar Generation
export interface GenerateVoiceAvatarInput {
  voiceDataUri: string;
}

export interface GenerateVoiceAvatarOutput {
  avatarDataUri: string;
}

// For Feed/Voces feature
export interface VozComment {
  id: string;
  vozId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: string; // ISO date string
}

export interface Voz {
  id: string;
  userId: string;
  userName:string;
  userAvatarUrl?: string;
  audioUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string; // ISO date string
  isLiked?: boolean; // Client-side state for mocking like interaction
  comments?: VozComment[]; // Added to store comments for a Voz
  hidden?: boolean; // Admin-only: hide from feed
  reported?: boolean; // Marked as reported for admin visibility/demo
}

// For Notifications
export interface Notification {
  id: string;
  type: 'new_follower' | 'like' | 'comment' | 'ecosystem_invite' | 'generic';
  userId: string; // User who triggered the notification OR target user for generic notification
  userName: string; // Name of the user who triggered (e.g. "Carlos López te siguió") or context name
  userAvatarUrl?: string;
  vozId?: string; // If related to a Voz
  vozCaptionPreview?: string; // Preview of the Voz caption
  commentTextPreview?: string; // Preview of the comment text
  ecosystemId?: string; // If related to an ecosystem
  ecosystemName?: string; // Name of the ecosystem
  genericMessage?: string; // For generic notifications
  createdAt: string; // ISO date string
  isRead: boolean;
  link?: string; // Optional link to navigate to
}
