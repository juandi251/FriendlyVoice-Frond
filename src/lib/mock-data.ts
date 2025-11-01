import type { User, Voz, VozComment, Message, Chat, Ecosystem, Notification } from '@/types/friendly-voice';

export const mockUsers: User[] = [
  {
    id: 'userAnaP',
    name: 'Ana Pérez',
    email: 'ana.perez@example.com',
    avatarUrl: 'https://picsum.photos/seed/anap/200',
    bio: 'Entusiasta de la tecnología y amante de los podcasts. Siempre en busca de nuevas voces e ideas.',
    interests: ['Tecnología', 'Podcasts', 'Música Indie'],
    personalityTags: ['Curiosa', 'Amigable'],
    followers: ['userCarlosL', 'userLauraG', 'userDemo'],
    following: ['userCarlosL', 'userLauraG', 'userDemo'], 
    voiceSamples: [],
  },
  {
    id: 'userCarlosL',
    name: 'Carlos López',
    email: 'carlos.lopez@example.com',
    avatarUrl: 'https://picsum.photos/seed/carlosl/200',
    bio: 'Desarrollador de software y aficionado a la ciencia ficción. Me gusta compartir mis pensamientos sobre el futuro.',
    interests: ['Desarrollo de Software', 'Ciencia Ficción', 'Videojuegos'],
    personalityTags: ['Analítico', 'Creativo'],
    followers: ['userAnaP', 'userLauraG'],
    following: ['userAnaP', 'userLauraG'],
    voiceSamples: [],
  },
  {
    id: 'userLauraG',
    name: 'Laura García',
    email: 'laura.garcia@example.com',
    avatarUrl: 'https://picsum.photos/seed/laurag/200',
    bio: 'Música y viajera. Comparto fragmentos de mi vida y mis melodías.',
    interests: ['Música', 'Viajes', 'Fotografía'],
    personalityTags: ['Aventurera', 'Artística'],
    followers: ['userAnaP', 'userCarlosL'],
    following: ['userAnaP', 'userCarlosL'],
    voiceSamples: [],
  },
   {
    id: 'userDemo',
    name: 'Usuario Demo',
    email: 'demo@example.com',
    avatarUrl: 'https://picsum.photos/seed/demoUser/200',
    bio: 'Explorando FriendlyVoice.',
    interests: ['Nuevas Experiencias'],
    personalityTags: ['Explorador'],
    followers: ['userAnaP'],
    following: ['userCarlosL', 'userAnaP'],
    voiceSamples: [],
  }
];

const commentsForVoz1: VozComment[] = [
  {
    id: 'comment1-1',
    vozId: 'voz1',
    userId: 'userCarlosL',
    userName: 'Carlos López',
    userAvatarUrl: 'https://picsum.photos/seed/carlosl/60',
    text: '¡Muy interesante tu perspectiva, Ana! Totalmente de acuerdo con lo que mencionas sobre el capítulo 3.',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
  },
  {
    id: 'comment1-2',
    vozId: 'voz1',
    userId: 'userLauraG',
    userName: 'Laura García',
    userAvatarUrl: 'https://picsum.photos/seed/laurag/60',
    text: '¡Qué buen libro! Lo añadiré a mi lista de lectura. Gracias por la recomendación.',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
  },
];

const commentsForVoz2: VozComment[] = [
 {
    id: 'comment2-1',
    vozId: 'voz2',
    userId: 'userAnaP',
    userName: 'Ana Pérez',
    userAvatarUrl: 'https://picsum.photos/seed/anap/60',
    text: '¡Ja, ja! Por aquí también hace un sol increíble. ¡A disfrutarlo!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
  }
];


// Mock voces eliminadas - ahora solo se muestran voces reales de Firestore (usuarios registrados con avatares de voz)
export const initialMockVoces: Voz[] = [];


const generateChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const mockDirectMessages: Message[] = [
  {
    id: 'dm1',
    chatId: generateChatId('userAnaP', 'userCarlosL'),
    senderId: 'userAnaP',
    recipientId: 'userCarlosL',
    voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), 
  },
  {
    id: 'dm2',
    chatId: generateChatId('userAnaP', 'userCarlosL'),
    senderId: 'userCarlosL',
    recipientId: 'userAnaP',
    voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), 
  },
  {
    id: 'dm3',
    chatId: generateChatId('userAnaP', 'userCarlosL'),
    senderId: 'userAnaP',
    recipientId: 'userCarlosL',
    voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), 
  },
  {
    id: 'dm4',
    chatId: generateChatId('userLauraG', 'userCarlosL'),
    senderId: 'userLauraG',
    recipientId: 'userCarlosL',
    voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), 
  },
];

export const mockChatsList: Chat[] = [
  {
    id: generateChatId('userAnaP', 'userCarlosL'),
    participantIds: ['userAnaP', 'userCarlosL'],
    otherUserName: 'Carlos López', 
    otherUserAvatar: mockUsers.find(u => u.id === 'userCarlosL')?.avatarUrl,
    lastMessage: mockDirectMessages.filter(m => m.chatId === generateChatId('userAnaP', 'userCarlosL')).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    unreadCount: 1,
  },
  {
    id: generateChatId('userLauraG', 'userCarlosL'),
    participantIds: ['userLauraG', 'userCarlosL'],
    otherUserName: 'Carlos López', 
    otherUserAvatar: mockUsers.find(u => u.id === 'userCarlosL')?.avatarUrl,
    lastMessage: mockDirectMessages.filter(m => m.chatId === generateChatId('userLauraG', 'userCarlosL')).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 0,
  },
];

// Mock data for ecosystems, translated to Spanish
export const mockEcosystems: Ecosystem[] = [
  {
    id: '1',
    name: 'Charlas Tecnológicas Semanales',
    topic: 'Lo último en tecnología y desarrollo de software',
    description: 'Únete a nuestra discusión semanal sobre todo lo relacionado con la tecnología. Desde nuevos frameworks hasta avances en IA, lo cubrimos todo.',
    tags: ['Tecnología', 'Software', 'IA', 'Innovación'],
    hostIds: ['user1'],
    createdBy: 'user1',
    createdAt: new Date().toISOString(),
    isActive: true,
    participantCount: 125,
  },
  {
    id: '2',
    name: 'Mañanas Conscientes',
    topic: 'Prácticas de meditación y mindfulness',
    description: 'Comienza tu día con una sesión de meditación guiada y comparte tus pensamientos sobre cómo vivir una vida más consciente.',
    tags: ['Mindfulness', 'Meditación', 'Bienestar', 'Autocuidado'],
    hostIds: ['user2'],
    createdBy: 'user2',
    createdAt: new Date().toISOString(),
    isActive: true,
    participantCount: 78,
  },
  {
    id: '3',
    name: 'Lectores Unidos',
    topic: 'Discutiendo nuestros libros favoritos',
    description: 'Un espacio amigable para los amantes de los libros donde discutir lecturas recientes, literatura clásica y joyas ocultas. ¡Todos los géneros son bienvenidos!',
    tags: ['Libros', 'Literatura', 'Lectura', 'Comunidad'],
    hostIds: ['user3'],
    createdBy: 'user3',
    createdAt: new Date().toISOString(),
    isActive: false,
    participantCount: 45,
  },
    {
    id: '4',
    name: 'Travesías Emprendedoras',
    topic: 'Historias de emprendedores y fundadores',
    description: 'Escucha e interactúa con fundadores de startups sobre sus desafíos, éxitos y aprendizajes.',
    tags: ['Emprendimiento', 'Startups', 'Negocios', 'Motivación'],
    hostIds: ['user4'],
    createdBy: 'user4',
    createdAt: new Date().toISOString(),
    isActive: true,
    participantCount: 210,
  },
];


// Mock data for Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'new_follower',
    userId: 'userCarlosL',
    userName: 'Carlos López',
    userAvatarUrl: mockUsers.find(u => u.id === 'userCarlosL')?.avatarUrl,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    isRead: false,
  },
  {
    id: 'notif2',
    type: 'like',
    userId: 'userLauraG',
    userName: 'Laura García',
    userAvatarUrl: mockUsers.find(u => u.id === 'userLauraG')?.avatarUrl,
    vozId: 'voz1', // Liked Ana's first Voz
    vozCaptionPreview: initialMockVoces.find(v => v.id === 'voz1')?.caption?.substring(0, 50) + "...",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    isRead: false,
  },
  {
    id: 'notif3',
    type: 'comment',
    userId: 'userAnaP',
    userName: 'Ana Pérez',
    userAvatarUrl: mockUsers.find(u => u.id === 'userAnaP')?.avatarUrl,
    vozId: 'voz2', // Commented on Carlos's Voz
    vozCaptionPreview: initialMockVoces.find(v => v.id === 'voz2')?.caption?.substring(0, 50) + "...",
    commentTextPreview: initialMockVoces.find(v => v.id === 'voz2')?.comments?.find(c => c.userId === 'userAnaP')?.text.substring(0, 50) + "...",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    isRead: true,
  },
  {
    id: 'notif4',
    type: 'new_follower',
    userId: 'userDemo',
    userName: 'Usuario Demo',
    userAvatarUrl: mockUsers.find(u => u.id === 'userDemo')?.avatarUrl,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
  },
   {
    id: 'notif5',
    type: 'like',
    userId: 'userCarlosL',
    userName: 'Carlos López',
    userAvatarUrl: mockUsers.find(u => u.id === 'userCarlosL')?.avatarUrl,
    vozId: 'voz3', 
    vozCaptionPreview: initialMockVoces.find(v => v.id === 'voz3')?.caption?.substring(0, 50) + "...",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    isRead: true,
  },
];
