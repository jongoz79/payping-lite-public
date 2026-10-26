export type CapturePlatform = 'android' | 'ios';
export type CaptureDirection = 'in' | 'out' | 'info';
export type CaptureConfidence = 'high' | 'low' | 'none';
export type CaptureStatus = 'logged' | 'needs_review' | 'ignored';

export interface CaptureRow {
  id: string;
  platform: CapturePlatform;
  source_app: string;
  parser_id: string | null;
  title: string;
  body: string;
  posted_at: number;
  captured_at: number;
  dedupe_key: string;
  rule_id: string | null;
  direction: CaptureDirection;
  amount_minor: number | null;
  currency: string;
  counterparty: string | null;
  reference: string | null;
  confidence: CaptureConfidence;
  status: CaptureStatus;
  user_note: string | null;
  user_edited: 0 | 1;
  synced_at: number | null;
}

export interface CaptureFilters {
  sourceApp?: string;
  direction?: CaptureDirection;
  status?: CaptureStatus;
  parserId?: string | null;
  from?: number;
  to?: number;
  beforePostedAt?: number;
  beforeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export type CaptureEdits = {
  status?: CaptureStatus;
  user_note?: string | null;
  direction?: CaptureDirection;
  amount_minor?: number | null;
  counterparty?: string | null;
};

export type CaptureCorrections = Pick<
  CaptureEdits,
  'direction' | 'amount_minor' | 'counterparty'
>;

export type ParserSource = 'pasted' | 'file' | 'created';

export interface ParserRow {
  id: string;
  json: string;
  enabled: 0 | 1;
  source: ParserSource;
  updated_at: number;
}

export interface ParserWrite {
  id: string;
  json: string;
  enabled?: boolean;
  source: ParserSource;
  updatedAt?: number;
}

export interface SelectedAppRow {
  package: string;
  label: string;
  added_at: number;
}

export interface SelectedAppWrite {
  package: string;
  label: string;
  addedAt?: number;
}

export interface SettingRow {
  key: string;
  value: string;
}
