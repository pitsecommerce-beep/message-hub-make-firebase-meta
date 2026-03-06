export type UserRole = 'admin' | 'manager' | 'sales_agent' | 'warehouse';

export type ModuleAccess = 'crm' | 'wms';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  modules: ModuleAccess[];
  teamId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  settings: TeamSettings;
}

export interface TeamSettings {
  primaryColor: string;
  logoUrl?: string;
  aiProviders: AIProviderConfig[];
  businessHours: BusinessHours;
  metaConfig: MetaConfig;
}

export interface BusinessHours {
  timezone: string;
  schedule: WeekSchedule;
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface MetaConfig {
  yCloudApiKey?: string;
  whatsappBusinessId?: string;
  phoneNumberId?: string;
  webhookVerifyToken?: string;
  makeWebhookUrl?: string;
}

export type MessagePlatform = 'whatsapp' | 'messenger' | 'instagram';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Contact {
  id: string;
  teamId: string;
  name: string;
  phone?: string;
  email?: string;
  platform: MessagePlatform;
  platformId: string;
  avatarUrl?: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface Conversation {
  id: string;
  teamId: string;
  contactId: string;
  contact?: Contact;
  platform: MessagePlatform;
  assignedTo?: string;
  assignedUser?: AppUser;
  status: 'open' | 'closed' | 'pending';
  aiEnabled: boolean;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  teamId: string;
  direction: MessageDirection;
  platform: MessagePlatform;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  mediaUrl?: string;
  status: MessageStatus;
  sentBy?: string;
  isAiGenerated: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export const ORDER_FUNNEL_STAGES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
];

export interface OrderItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  teamId: string;
  contactId: string;
  contact?: Contact;
  conversationId?: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress?: string;
  trackingNumber?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  assignedWarehouseUser?: string;
}

export type AIProviderType = 'openai' | 'anthropic' | 'custom';

export interface AIProviderConfig {
  id: string;
  name: string;
  provider: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export type AIAgentScope = 'all' | 'selected' | 'none';

export interface AIAgent {
  id: string;
  teamId: string;
  name: string;
  providerId: string;
  systemPrompt: string;
  isActive: boolean;
  scope: AIAgentScope;
  selectedConversationIds: string[];
  useBusinessHours: boolean;
  customSchedule?: WeekSchedule;
  maxTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: UserRole;
  modules: ModuleAccess[];
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}
