export type Member = {
  id: number;
  displayName: string;
  email?: string;
  isHost?: boolean;
  userId?: number;
};

export type MemberDetails = Member & {
  wishlistItems: Array<{
    id: number;
    title: string;
    url?: string;
    notes?: string;
  }>;
  isYou: boolean;
};