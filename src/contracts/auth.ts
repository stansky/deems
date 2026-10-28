import { z } from "zod";
export const authLoginSchema = z.object({username:z.string().min(1).max(320),password:z.string().min(1).max(1024)}).strict();
export const authChallengeInputSchema = z.object({code:z.string().min(1).max(128).optional(),newPassword:z.string().min(8).max(1024).optional()}).strict();
export const authResponseSchema = z.object({authenticated:z.boolean().optional(),admin:z.boolean().optional(),expiresAt:z.number().optional(),authRequired:z.boolean().optional(),workspaceKey:z.string().regex(/^deems_[a-f0-9]{56}$/).optional(),registrationEnabled:z.boolean().optional(),challenge:z.enum(["SOFTWARE_TOKEN_MFA","SMS_MFA","NEW_PASSWORD_REQUIRED"]).optional()});

const email = z.email().trim().toLowerCase().max(320);
const password = z.string().min(12).max(128);
const confirmationCode = z.string().regex(/^\d{6}$/);
export const authRegistrationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signup"), email, password }).strict(),
  z.object({ action: z.literal("confirm"), email, code: confirmationCode }).strict(),
  z.object({ action: z.literal("resend"), email }).strict(),
  z.object({ action: z.literal("recover"), email }).strict(),
  z.object({ action: z.literal("reset"), email, code: confirmationCode, password }).strict(),
]);
export const authRegistrationResponseSchema = z.object({
  accepted: z.literal(true), confirmationRequired: z.boolean().optional(), confirmed: z.boolean().optional(), passwordReset: z.boolean().optional(),
}).strict();
