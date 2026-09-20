export type Channel = 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'WEBSITE' | 'META_LEAD_ADS';

export type Intent =
  | 'GREETING'
  | 'ROOM_PRICE'
  | 'ROOM_AVAILABILITY'
  | 'BOOKING'
  | 'BOOKING_INQUIRY'
  | 'ID_REQUIREMENTS'
  | 'HOTEL_INFORMATION'
  | 'LOCATION'
  | 'FACILITIES'
  | 'POLICY'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'LONG_STAY'
  | 'SHARED_KITCHEN'
  | 'TRANSPORTATION'
  | 'CANCELLATION'
  | 'PAYMENT'
  | 'COMPLAINT'
  | 'HUMAN_REQUEST'
  | 'OTHER';

export type ConversationStep =
  | 'GREETING'
  | 'AWAITING_DATES'
  | 'AWAITING_GUESTS'
  | 'AWAITING_ROOM_SELECTION'
  | 'CONFIRMING_SUMMARY'
  | 'HANDOVER'
  | 'COMPLETE';

export type SupportedLanguage = 'en' | 'ne' | 'hi';

export interface ExtractedEntities {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  roomType?: string;
  roomsCount?: number;
  guestName?: string;
  phone?: string;
  email?: string;
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  language: SupportedLanguage;
  entities: ExtractedEntities;
  reason?: string;
}

export interface UnifiedInboundMessage {
  externalMessageId?: string;
  channel: Channel;
  senderId: string; // Phone number or Meta PSID / IGSID
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  content: string;
  messageType?: 'TEXT' | 'BUTTON' | 'QUICK_REPLY' | 'IMAGE';
  timestamp?: Date;
  rawPayload?: any;
  campaignInfo?: {
    campaign?: string;
    campaignId?: string;
    adset?: string;
    adsetId?: string;
    ad?: string;
    adId?: string;
  };
}

export interface UnifiedOutboundResponse {
  content: string;
  suggestedReplies?: string[];
  intent: Intent;
  step: ConversationStep;
  triggerHandover: boolean;
  handoverReason?: string;
  summary?: string;
}
