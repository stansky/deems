import { z } from "zod";
export const authLoginSchema = z.object({username:z.string().min(1).max(320),password:z.string().min(1).max(1024)}).strict();
export const authChallengeInputSchema = z.object({code:z.string().min(1).max(128).optional(),newPassword:z.string().min(8).max(1024).optional()}).strict();
export const authResponseSchema = z.object({authenticated:z.boolean().optional(),expiresAt:z.number().optional(),challenge:z.enum(["SOFTWARE_TOKEN_MFA","SMS_MFA","NEW_PASSWORD_REQUIRED"]).optional()});
