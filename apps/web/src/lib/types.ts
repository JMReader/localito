export type ParticipantRole = "member" | "merchant";

export interface Participant {
  id: string;
  alias: string;
  display_name: string;
  role: ParticipantRole;
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  available_cents: number;
  max_positive_cents: number;
  receive_capacity_cents: number;
}

export interface AuthResult {
  token: string;
  participant: Participant;
}

export interface TransactionParty {
  id: string;
  alias: string;
  display_name: string;
}

export interface PaymentTransaction {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  from: TransactionParty;
  to: TransactionParty;
  note?: string | null;
  created_at: string;
  balance_after_cents: number;
  counterparty_balance_after_cents: number;
}

export interface PaymentResult {
  transaction: PaymentTransaction;
  idempotent_replay: boolean;
}

export interface HistoryTransaction {
  id: string;
  direction: "out" | "in";
  counterparty: {
    alias: string;
    display_name: string;
  };
  amount_cents: number;
  note?: string | null;
  created_at: string;
  balance_after_cents: number;
}

export interface ParticipantsResponse {
  participants: Participant[];
}

export interface TransactionsResponse {
  transactions: HistoryTransaction[];
}

export interface Stats {
  participant_count: number;
  transaction_count: number;
  total_volume_cents: number;
  sum_balances_cents: number;
  zero_sum_ok: boolean;
  currency: string;
}
