export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "URGENT"
  | "ALLOTMENT"
  | "PROFIT";

export type NotificationAudience = "ALL_MEMBERS" | "SPECIFIC_MEMBER";

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: NotificationAudience;
  targetMemberId?: string;
  targetMemberName?: string;
  isRead?: boolean;
  linkUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  targetAudience?: NotificationAudience;
  targetMemberId?: string;
  linkUrl?: string;
}

export interface UpdateNotificationInput {
  id: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  targetAudience?: NotificationAudience;
  targetMemberId?: string;
  linkUrl?: string;
}
