import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid input", 422, parseZodError(parsed.error));
    }

    const { name, email, subject, message } = parsed.data;

    const ticket = await db.supportTicket.create({
      data: {
        userId: null,
        subject,
        body: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        priority: "normal",
        status: "open",
      },
    });

    return ok({ ticketId: ticket.id });
  } catch (err) {
    return fail(err);
  }
}
