import { z } from 'zod';

export const updateMemberSchema = z.object({
  memberId: z.coerce.number().int().positive('Member id must be a positive integer'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(255, 'Display name must be 255 characters or less')
    .optional(),
  email: z.string().trim().email('Invalid email address').optional(),
});

export const updateFamilySettingsSchema = z.object({
  verificationEmail: z
    .string()
    .trim()
    .email('Invalid verification email address')
    .or(z.literal(''))
    .optional(),
});
