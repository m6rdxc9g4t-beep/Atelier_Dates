/**
 * Types de la base Supabase, écrits à la main d'après
 * supabase/migrations/20261018000000_init.sql.
 *
 * Une fois le projet Supabase lié, tu peux les régénérer avec :
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DateStatus = "proposed" | "accepted" | "declined" | "done";
export type VoteValue = "yes" | "maybe" | "no";
export type WishKind = "activity" | "weekend" | "trip" | "project";
export type WishStatus = "idea" | "planned" | "done";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type CoupleRow = {
  id: string;
  name: string;
  started_on: string | null;
  invite_code: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  couple_id: string | null;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  created_at: string;
};

export type DateProposalRow = {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  proposed_at: string | null;
  budget: number | null;
  status: DateStatus;
  created_at: string;
};

export type DateVoteRow = {
  proposal_id: string;
  couple_id: string;
  user_id: string;
  vote: VoteValue;
  created_at: string;
};

export type PotRow = {
  id: string;
  couple_id: string;
  created_by: string;
  name: string;
  description: string | null;
  emoji: string;
  budget: number | null;
  currency: string;
  archived: boolean;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  pot_id: string;
  couple_id: string;
  created_by: string;
  paid_by: string;
  title: string;
  amount: number;
  payer_share: number;
  spent_on: string;
  is_settlement: boolean;
  created_at: string;
};

export type AlbumRow = {
  id: string;
  couple_id: string;
  name: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  couple_id: string;
  created_by: string;
  album_id: string | null;
  title: string;
  note: string | null;
  happened_on: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type MemoryPhotoRow = {
  id: string;
  memory_id: string;
  couple_id: string;
  storage_path: string;
  position: number;
  created_at: string;
};

export type WishRow = {
  id: string;
  couple_id: string;
  created_by: string;
  kind: WishKind;
  title: string;
  description: string | null;
  estimated_budget: number | null;
  status: WishStatus;
  created_at: string;
};

export type WishDesireRow = {
  wish_id: string;
  couple_id: string;
  user_id: string;
  level: number;
  updated_at: string;
};

export type SurpriseRow = {
  id: string;
  couple_id: string;
  created_by: string;
  recipient_id: string;
  teaser: string;
  reveal_at: string;
  created_at: string;
};

export type SurpriseSecretRow = {
  surprise_id: string;
  couple_id: string;
  title: string;
  message: string | null;
};

export type SurpriseHintRow = {
  id: string;
  surprise_id: string;
  couple_id: string;
  content: string;
  reveal_at: string;
  created_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      couples: Table<CoupleRow, never, Partial<Pick<CoupleRow, "name" | "started_on">>>;
      profiles: Table<
        ProfileRow,
        never,
        Partial<Pick<ProfileRow, "display_name" | "avatar_url" | "phone" | "notify_email" | "notify_sms">>
      >;
      date_proposals: Table<
        DateProposalRow,
        Pick<DateProposalRow, "couple_id" | "created_by" | "title"> &
          Partial<Pick<DateProposalRow, "description" | "location" | "proposed_at" | "budget">>,
        Partial<Pick<DateProposalRow, "title" | "description" | "location" | "proposed_at" | "budget">>
      >;
      date_votes: Table<DateVoteRow, Omit<DateVoteRow, "created_at">, Partial<Pick<DateVoteRow, "vote">>>;
      pots: Table<
        PotRow,
        Pick<PotRow, "couple_id" | "created_by" | "name"> &
          Partial<Pick<PotRow, "description" | "emoji" | "budget" | "currency" | "archived">>
      >;
      expenses: Table<
        ExpenseRow,
        Pick<ExpenseRow, "pot_id" | "couple_id" | "created_by" | "paid_by" | "title" | "amount"> &
          Partial<Pick<ExpenseRow, "payer_share" | "spent_on" | "is_settlement">>
      >;
      albums: Table<AlbumRow, Pick<AlbumRow, "couple_id" | "name">>;
      memories: Table<
        MemoryRow,
        Pick<MemoryRow, "couple_id" | "created_by" | "title"> &
          Partial<
            Pick<MemoryRow, "album_id" | "note" | "happened_on" | "location_name" | "latitude" | "longitude">
          >
      >;
      memory_photos: Table<
        MemoryPhotoRow,
        Pick<MemoryPhotoRow, "memory_id" | "couple_id" | "storage_path"> & Partial<Pick<MemoryPhotoRow, "position">>
      >;
      wishes: Table<
        WishRow,
        Pick<WishRow, "couple_id" | "created_by" | "title"> &
          Partial<Pick<WishRow, "kind" | "description" | "estimated_budget" | "status">>
      >;
      wish_desires: Table<
        WishDesireRow,
        Pick<WishDesireRow, "wish_id" | "couple_id" | "user_id" | "level"> & Partial<Pick<WishDesireRow, "updated_at">>
      >;
      surprises: Table<SurpriseRow, Pick<SurpriseRow, "couple_id" | "created_by" | "recipient_id" | "teaser" | "reveal_at">>;
      surprise_secrets: Table<
        SurpriseSecretRow,
        Pick<SurpriseSecretRow, "surprise_id" | "couple_id" | "title"> & Partial<Pick<SurpriseSecretRow, "message">>
      >;
      surprise_hints: Table<SurpriseHintRow, Pick<SurpriseHintRow, "surprise_id" | "couple_id" | "content" | "reveal_at">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      my_couple_id: { Args: Record<string, never>; Returns: string | null };
      is_couple_member: { Args: { p_user: string; p_couple: string }; Returns: boolean };
      create_couple: { Args: { p_name: string; p_started_on?: string | null }; Returns: string };
      join_couple: { Args: { p_code: string }; Returns: string };
      complete_date: { Args: { p_proposal: string }; Returns: undefined };
    };
    Enums: {
      date_status: DateStatus;
      vote_value: VoteValue;
      wish_kind: WishKind;
      wish_status: WishStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
