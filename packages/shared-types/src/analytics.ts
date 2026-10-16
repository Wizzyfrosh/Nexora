export const PUBLIC_ANALYTICS_EVENTS = ["PAGE_VIEW", "WHATSAPP_CLICK"] as const;
export type PublicAnalyticsEvent = (typeof PUBLIC_ANALYTICS_EVENTS)[number];
export interface AnalyticsCapture {
  eventId: string;
  eventType: PublicAnalyticsEvent;
  consent: true;
}
export interface AnalyticsDay {
  date: string;
  pageViews: number;
  whatsappClicks: number;
  enquiries: number;
}
export interface AnalyticsReport {
  collectionEnabled: boolean;
  days: 7 | 30 | 90;
  from: string;
  through: string;
  totals: { pageViews: number; whatsappClicks: number; enquiries: number };
  series: AnalyticsDay[];
  processing: {
    pending: number;
    review: number;
    oldestPendingAt: string | null;
    lastAggregatedAt: string | null;
  };
}
