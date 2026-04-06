import { z } from "zod"

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid EVM address")

export const builderFormSchema = z.object({
  appUrl: z.string().min(1, "App URL or domain is required"),
  appName: z.string().max(80).optional().or(z.literal("")),
  iconUrl: z.string().url("Enter a valid icon URL").optional().or(z.literal("")),
  contractAddress: evmAddressSchema,
  chainId: z.coerce.number().int().positive("Enter a valid chain ID"),
  rpcUrl: z.string().url("Enter a valid RPC URL").optional().or(z.literal("")),
})

export const proofCheckRequestSchema = z.object({
  walletAddress: evmAddressSchema,
  contractAddress: evmAddressSchema,
  chainId: z.number().int().positive(),
})

export type BuilderFormValues = z.infer<typeof builderFormSchema>
