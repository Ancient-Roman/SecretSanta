import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const joinFamilySchema = z.object({
  code: z
    .string()
    .length(6, 'Family code must be 6 characters')
    .toUpperCase(),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(255, 'Display name must be 255 characters or less'),
  email: z.string().email('Invalid email address'),
});

export const createFamilySchema = z.object({
  name: z
    .string()
    .min(1, 'Family name is required')
    .max(255, 'Family name must be 255 characters or less'),
  budget: z.coerce.number().int().positive().optional(),
  exchangeDate: z.coerce.date().optional(),
});

export const addWishlistItemSchema = z.object({
  title: z
    .string()
    .min(1, 'Item title is required')
    .max(255, 'Title must be 255 characters or less'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

export const updateWishlistItemSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z
    .string()
    .min(1, 'Item title is required')
    .max(255, 'Title must be 255 characters or less'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

export const reorderWishlistSchema = z.object({
  itemIds: z.array(z.number().int().positive()),
});

export const addExclusionSchema = z.object({
  targetMembershipId: z.coerce.number().int().positive(),
});

export const removeExclusionSchema = z.object({
  targetMembershipId: z.coerce.number().int().positive(),
});

export const removeParticipantSchema = z.object({
  membershipId: z.coerce.number().int().positive(),
});

export const toggleHostParticipantSchema = z.object({
  participate: z.boolean(),
});

export const drawNamesSchema = z.object({
  // Empty payload, just confirms the action
});
