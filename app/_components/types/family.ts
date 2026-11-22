import { Exclusion } from "./exclusion";
import { Member, MemberDetails } from "./member";

/** Open (can join), locked (before event), day_of, completed */
export type FamilyStatus = 'open' | 'locked' | 'day_of' | 'completed';

export type HostFamily = {
  id: number;
  name: string;
  status: FamilyStatus;
  verificationEmail?: string | null;
  members: Member[];
  exclusions: Exclusion[];
  failedEmails: Array<{ giver: string; receiver: string; error: string }>;
}

export type FamilyMemberData = {
  id: number;
  name: string;
  code: string;
  status: FamilyStatus;
  budget?: number;
  exchangeDate?: string;
  members: MemberDetails[];
  isHost: boolean;
  myAssignment?: {
    receiver: string;
    budget?: number;
    exchangeDate?: string;
  };
}