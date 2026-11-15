import type { EnquiryStatus, VisitStatus } from "@/lib/domain/ops";

export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  open: "Waiting for owner",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  requested: "Visit requested",
  confirmed: "Visit confirmed",
  rescheduled: "New time suggested",
  declined: "Visit declined",
  cancelled: "Visit cancelled",
};
