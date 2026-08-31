// TypeScript interfaces for Mail Broadcasting & Campaign Management System

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled"
  | "failed";

export type RecipientStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "unsubscribed";

export type AudienceType =
  | "all_users"
  | "subscribers_only"
  | "selected_users"
  | "segment"
  | "custom_filter";

export type FilterField =
  | "full_name"
  | "email"
  | "phone"
  | "role"
  | "state"
  | "city"
  | "pincode"
  | "total_orders"
  | "total_spending"
  | "avg_order_value"
  | "last_order_days"
  | "purchased_category"
  | "purchased_product"
  | "registered_days"
  | "marketing_consent"
  | "order_status";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "is_true"
  | "is_false"
  | "in"
  | "not_in";

export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: any;
}

export interface FilterRuleGroup {
  combinator: "AND" | "OR";
  conditions: FilterCondition[];
}

export type EmailBlockType =
  | "header"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "product_card"
  | "product_grid"
  | "coupon_box"
  | "trust_badges"
  | "social_links"
  | "html_block"
  | "footer";

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string | null;
  subject: string;
  preview_text?: string | null;
  sender_name: string;
  sender_email: string;
  reply_to?: string | null;
  content_json: EmailBlock[];
  content_html?: string | null;
  plain_text?: string | null;
  audience_type: AudienceType;
  segment_id?: string | null;
  filter_rules?: FilterRuleGroup | null;
  selected_user_ids?: string[];
  status: CampaignStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  unique_opens_count: number;
  clicked_count: number;
  unique_clicks_count: number;
  failed_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaign_id: string;
  user_id?: string | null;
  email: string;
  name?: string | null;
  status: RecipientStatus;
  provider_message_id?: string | null;
  error_message?: string | null;
  retry_count: number;
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  bounced_at?: string | null;
  unsubscribed_at?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface EmailSegment {
  id: string;
  name: string;
  description?: string | null;
  filter_rules: FilterRuleGroup;
  user_count_cache: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category:
    | "promotional"
    | "product_launch"
    | "festival"
    | "welcome"
    | "re_engagement"
    | "appreciation"
    | "discount"
    | "newsletter";
  subject: string;
  preview_text?: string | null;
  content_json: EmailBlock[];
  content_html?: string | null;
  preview_image?: string | null;
  is_built_in: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSubscriber {
  id: string;
  user_id?: string | null;
  email: string;
  name?: string | null;
  phone?: string | null;
  status: "subscribed" | "unsubscribed" | "bounced" | "suppressed";
  marketing_opt_in: boolean;
  promotions_opt_in: boolean;
  newsletters_opt_in: boolean;
  product_updates_opt_in: boolean;
  total_orders: number;
  total_spending_paise: number;
  last_order_at?: string | null;
  last_email_opened_at?: string | null;
  last_email_clicked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSettings {
  default_sender_name: string;
  default_sender_email: string;
  default_reply_to: string;
  provider: "resend" | "smtp" | "custom";
  resend_api_key_configured: boolean;
  batch_size: number;
  rate_limit_per_minute: number;
  daily_send_limit: number;
  enable_open_tracking: boolean;
  enable_click_tracking: boolean;
  enable_frequency_capping: boolean;
  max_emails_per_user_per_week: number;
  require_typing_confirmation_threshold: number;
  physical_business_address: string;
  compliance_footer_note: string;
}
