export type GoogleAccount = {
  id: string; email: string; display_name: string | null; avatar_url: string | null;
  status: "connected" | "needs_reauth" | "error" | "disconnected";
  last_synced_at: string | null; created_at: string;
};
export type DriveFile = {
  id: string; account_id: string; name: string; mime_type: string;
  size_bytes: number | null; modified_time: string | null; web_view_link: string | null;
  is_folder: boolean; account_email?: string;
};
export type ShareRequest = {
  id: string; requester_email: string | null; requester_name: string | null;
  item_name: string | null; source_account_email: string; received_at: string;
  status: "pending" | "approved" | "rejected" | "needs_review" | "failed";
  classification_reason?: string;
};
export type DocumentInsight = {
  id: string; account_id: string; google_file_id: string; model: string;
  language: string; document_type: string; title: string; summary: string;
  key_points: string[]; topics: string[]; entities: string[]; action_items: string[];
  confidence: number; status: "queued" | "processing" | "complete" | "failed";
  error_message: string | null; source_modified_time: string | null; updated_at: string;
};
