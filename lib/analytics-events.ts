export type DiagnosticId = "ops_check" | "silent_collapse" | "media_ops_score";

export type ConversionEvent =
  | {
      event: "resource_cta_click";
      resource_path: string;
      resource_label: string;
      resource_location: string;
    }
  | {
      event: "diagnostic_start";
      diagnostic_id: DiagnosticId;
      source: string;
    }
  | {
      event: "diagnostic_complete";
      diagnostic_id: DiagnosticId;
      source: string;
      score?: number;
      result_band?: string;
      qualified?: boolean;
    }
  | {
      event: "application_start";
      application_id: "custom_ops_hub";
      source: string;
    }
  | {
      event: "qualified_submission";
      application_id: "custom_ops_hub" | "ops_check_booking";
      source: string;
    };

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    clarity?: (command: string, eventName: string) => void;
  }
}

export function trackConversionEvent(event: ConversionEvent): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
  window.clarity?.("event", event.event);
}
