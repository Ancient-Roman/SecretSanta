import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  unique,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  families: many(families),
  memberships: many(memberships),
  loginTokens: many(loginTokens),
}));

// Families table
export const families = pgTable(
  'families',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 6 }).notNull().unique(),
    status: varchar('status', {
      enum: ['open', 'locked', 'day_of', 'completed'],
    }).notNull().default('open'),
    budget: integer('budget'),
    exchangeDate: timestamp('exchange_date'),
    hostUserId: integer('host_user_id').notNull(),
    joinEnabled: boolean('join_enabled').notNull().default(true),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    hostUserIdIdx: index('host_user_id_idx').on(table.hostUserId),
  })
);

export const familiesRelations = relations(families, ({ one, many }) => ({
  host: one(users, {
    fields: [families.hostUserId],
    references: [users.id],
  }),
  memberships: many(memberships),
  exclusions: many(exclusions),
  assignments: many(assignments),
}));

// Memberships table
export const memberships = pgTable(
  'memberships',
  {
    id: serial('id').primaryKey(),
    familyId: integer('family_id').notNull(),
    userId: integer('user_id').notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    isParticipant: boolean('is_participant').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_family_user').on(table.familyId, table.userId),
    index('memberships_family_id_idx').on(table.familyId),
    index('memberships_user_id_idx').on(table.userId),
  ]
);

export const membershipsRelations = relations(
  memberships,
  ({ one, many }) => ({
    family: one(families, {
      fields: [memberships.familyId],
      references: [families.id],
    }),
    user: one(users, {
      fields: [memberships.userId],
      references: [users.id],
    }),
    wishlistItems: many(wishlistItems),
    givenAssignments: many(assignments, { relationName: 'giver' }),
    receivedAssignments: many(assignments, { relationName: 'receiver' }),
    exclusionsAsA: many(exclusions, { relationName: 'memberA' }),
    exclusionsAsB: many(exclusions, { relationName: 'memberB' }),
  })
);

// Wishlist items table
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: serial('id').primaryKey(),
    membershipId: integer('membership_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    url: text('url'),
    notes: text('notes'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('wishlist_items_membership_id_idx').on(table.membershipId),
  ]
);

export const wishlistItemsRelations = relations(
  wishlistItems,
  ({ one }) => ({
    membership: one(memberships, {
      fields: [wishlistItems.membershipId],
      references: [memberships.id],
    }),
  })
);

// Exclusions table (symmetric)
export const exclusions = pgTable(
  'exclusions',
  {
    id: serial('id').primaryKey(),
    familyId: integer('family_id').notNull(),
    memberAId: integer('member_a_id').notNull(),
    memberBId: integer('member_b_id').notNull(),
    createdByMembershipId: integer('created_by_membership_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_exclusion_pair').on(table.familyId, table.memberAId, table.memberBId),
    index('exclusions_family_id_idx').on(table.familyId),
    index('exclusions_member_a_id_idx').on(table.memberAId),
    index('exclusions_member_b_id_idx').on(table.memberBId),
  ]
);

export const exclusionsRelations = relations(
  exclusions,
  ({ one }) => ({
    family: one(families, {
      fields: [exclusions.familyId],
      references: [families.id],
    }),
    memberA: one(memberships, {
      fields: [exclusions.memberAId],
      references: [memberships.id],
      relationName: 'memberA',
    }),
    memberB: one(memberships, {
      fields: [exclusions.memberBId],
      references: [memberships.id],
      relationName: 'memberB',
    }),
  })
);

// Assignments table
export const assignments = pgTable(
  'assignments',
  {
    id: serial('id').primaryKey(),
    familyId: integer('family_id').notNull(),
    giverMembershipId: integer('giver_membership_id').notNull(),
    receiverMembershipId: integer('receiver_membership_id').notNull(),
    emailSentAt: timestamp('email_sent_at'),
    emailError: text('email_error'),
    revealedAt: timestamp('revealed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('assignments_family_id_idx').on(table.familyId),
    index('assignments_giver_idx').on(table.giverMembershipId),
    index('assignments_receiver_idx').on(table.receiverMembershipId),
  ]
);

export const assignmentsRelations = relations(
  assignments,
  ({ one }) => ({
    family: one(families, {
      fields: [assignments.familyId],
      references: [families.id],
    }),
    giver: one(memberships, {
      fields: [assignments.giverMembershipId],
      references: [memberships.id],
      relationName: 'giver',
    }),
    receiver: one(memberships, {
      fields: [assignments.receiverMembershipId],
      references: [memberships.id],
      relationName: 'receiver',
    }),
  })
);

// Login tokens table
export const loginTokens = pgTable(
  'login_tokens',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('login_tokens_email_idx').on(table.email),
    index('login_tokens_expires_at_idx').on(table.expiresAt),
  ]
);

export const loginTokensRelations = relations(
  loginTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [loginTokens.email],
      references: [users.email],
    }),
  })
);
