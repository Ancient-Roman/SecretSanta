export type Member = {
  id: number;
  displayName: string;
}

export type MemberDetails = Member & {
    wishlistItems: Array<{
    id: number;
    title: string;
    url?: string;
    notes?: string;
  }>;
  isYou: boolean;
};