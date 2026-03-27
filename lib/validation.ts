import { z } from "zod"

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid EVM address")

export const builderFormSchema = z.object({
  gameUrl: z.string().min(1, "Game URL or domain is required"),
  gameName: z.string().max(80).optional().or(z.literal("")),
  iconUrl: z.string().url("Enter a valid icon URL").optional().or(z.literal("")),
  slug: z.string().max(80).optional().or(z.literal("")),
  contractAddress: evmAddressSchema,
  chainId: z.coerce.number().int().positive("Enter a valid chain ID"),
})

export const proofCheckRequestSchema = z.object({
  walletAddress: evmAddressSchema,
  contractAddress: evmAddressSchema,
  chainId: z.number().int().positive(),
})

export type BuilderFormValues = z.infer<typeof builderFormSchema>
