import { Exclusion } from "./exclusion";
import { Member, MemberDetails } from "./member";

export type HostFamily = {
  id: number;
  name: string;
  status: string;
  members: Member[];
  exclusions: Exclusion[];
  failedEmails: Array<{ giver: string; receiver: string; error: string }>;
}

export type FamilyMemberData = {
  id: number;
  name: string;
  code: string;
  status: string;
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