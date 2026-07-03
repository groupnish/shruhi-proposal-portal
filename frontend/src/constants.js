export const STAGES = [
  { key: "enquiry", label: "Enquiry", color: "#5d7188" },
  { key: "costing", label: "Costing", color: "#f2a900" },
  { key: "costing_complete", label: "Costing complete", color: "#f2a900" },
  { key: "offer_prepared", label: "Offer prepared", color: "#1bb8b0" },
  { key: "offer_sent", label: "Offer sent", color: "#1bb8b0" },
  { key: "negotiation", label: "Negotiation", color: "#f2a900" },
  { key: "won", label: "Won", color: "#3fb950" },
  { key: "lost", label: "Lost", color: "#ff6b6b" },
];
export const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];

export const INQUIRY_TYPES = [
  { value: "purchase", label: "Purchase" },
  { value: "budgetary", label: "Budgetary" },
  { value: "tender", label: "Tender" },
];
