export type MemberExclusions = {
  exclusions: Array<{
    id: number;
    membershipId: number;
    displayName: string;
    createdByMe: boolean;
  }>;
}

export type Exclusion = {
  memberAId: number;
  memberBId: number;
  memberA: string;
  memberB: string;
}