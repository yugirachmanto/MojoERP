import { z } from "zod";

export const sendMessageSchema = z.object({
  room_id: z.string().uuid(),
  content: z.string().min(1, "Pesan tidak boleh kosong").max(10000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;