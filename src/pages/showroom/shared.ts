import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ShowroomDocument {
  id: string;
  kind: string;
  name: string;
  status: string;
  note: string | null;
  uploadedAt: string | null;
  key?: string;
}

export interface Showroom {
  id: string;
  code: string | null;
  status: "draft" | "submitted" | "under_review" | "info_required" | "approved" | "rejected" | "suspended" | "revoked";
  name: string;
  slug: string;
  owner: { name?: string; email?: string; mobile?: string; alternatePhone?: string };
  businessType: string | null;
  description: string;
  tagline: string;
  yearEstablished: number | null;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  registrationNumber: string;
  address: { line1?: string; line2?: string; city?: string; district?: string; state?: string; pincode?: string };
  location: { lat: number; lng: number } | null;
  hours: string;
  profile: { categories: string[]; brands: string[]; conditions: string[]; physicalShowroom: boolean };
  social: Record<string, string | undefined>;
  policies: { warranty?: string; returns?: string; delivery?: string; returnWindowDays?: number };
  settings: { lowStockThreshold?: number; autoAcceptOrders?: boolean; deliveryAvailable?: boolean; pickupAvailable?: boolean };
  logoUrl: string | null;
  bannerUrl: string | null;
  logoKey: string | null;
  bannerKey: string | null;
  documents: ShowroomDocument[];
  bank: { accountName: string; accountNumberLast4: string; ifsc: string } | null;
  onboardingStep: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  statusHistory: { status: string; note: string | null; at: string }[];
  pendingChanges: { status: string; fields: Record<string, unknown> | null; requestedAt: string; note: string | null } | null;
  missing: string[];
  createdAt: string;
}

export function useShowroom() {
  return useQuery({ queryKey: ["showroom"], queryFn: async () => (await api.get("/showroom/me")).data.data as Showroom | null, staleTime: 15_000 });
}

export const DOCUMENT_KINDS: { value: string; label: string; hint: string; required?: boolean }[] = [
  { value: "owner_id", label: "Owner ID proof", hint: "Aadhaar, passport, voter ID or driving licence", required: true },
  { value: "address_proof", label: "Business address proof", hint: "Rent agreement, utility bill or property document", required: true },
  { value: "gst_certificate", label: "GST certificate", hint: "One of GST certificate, trade licence or PAN card is required" },
  { value: "trade_license", label: "Trade licence", hint: "Shops & establishment or municipal licence" },
  { value: "pan_card", label: "Business PAN card", hint: "PAN of the business or proprietor" },
  { value: "shop_photo", label: "Showroom photo", hint: "Front of the shop with the signboard visible" },
  { value: "bank_proof", label: "Bank proof", hint: "Cancelled cheque or bank statement" },
  { value: "other", label: "Other document", hint: "Anything else that supports your application" },
];

export const BUSINESS_TYPES = [
  ["proprietorship", "Sole proprietorship"],
  ["partnership", "Partnership"],
  ["llp", "LLP"],
  ["private_limited", "Private limited"],
  ["public_limited", "Public limited"],
  ["other", "Other"],
] as const;

export const STATUS_COPY: Record<Showroom["status"], { title: string; body: string }> = {
  draft: { title: "Finish your application", body: "Complete every step and submit. Your progress is saved as you go." },
  submitted: { title: "Application submitted", body: "SureGad will review your details and documents, usually within 2 working days." },
  under_review: { title: "Under review", body: "A SureGad reviewer is checking your application now." },
  info_required: { title: "More information needed", body: "Update your application as requested below, then submit again." },
  approved: { title: "Approved", body: "Your showroom can list devices and take orders." },
  rejected: { title: "Application rejected", body: "Read the reason below. You can fix the details and submit again." },
  suspended: { title: "Showroom suspended", body: "Your listings are hidden from buyers. Contact support to resolve this." },
  revoked: { title: "Seller access revoked", body: "This showroom can no longer sell on SureGad. Contact support if you think this is a mistake." },
};
