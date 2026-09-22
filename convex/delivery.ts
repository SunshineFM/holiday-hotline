import { env } from "./_generated/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
export const send = internalAction({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, a) => {
    const r = await ctx.runMutation(internal.requests.claimDelivery, a);
    if (!r) return null;
    const key = env.AGENTMAIL_API_KEY,
      inbox = env.AGENTMAIL_INBOX_ID;
    if (!key || !inbox) {
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...a,
        status: "failed",
        error: "Email connection is not configured. Your answer is saved.",
      });
      return null;
    }
    const data = await ctx.runQuery(internal.requests.deliveryData, a);
    try {
      const response = await fetch(
        `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: [r.email],
            subject: `${data?.name ?? "Holiday Hotline"}: your shopping question`,
            text: `Hello ${r.shopper},\n\nAn associate checked your question about ${r.item}.\n\n${r.answer}\n\n${data?.photoUrl ? `Photo: ${data.photoUrl}\n\n` : ""}Availability was checked at the time of this reply. This is not a reservation.\n\nHoliday Hotline`,
            ...(data?.photoUrl
              ? {
                  attachments: [
                    { filename: "item-photo.jpg", url: data.photoUrl },
                  ],
                }
              : {}),
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok) {
        await ctx.runMutation(internal.requests.deliveryResult, {
          ...a,
          status: response.status >= 500 ? "uncertain" : "failed",
          error:
            "The email provider did not confirm the send. Check the provider before sending again.",
        });
        return null;
      }
      const body = (await response.json()) as { message_id?: string };
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...a,
        status: body.message_id ? "sent" : "uncertain",
        ...(body.message_id
          ? { messageId: body.message_id }
          : { error: "The email provider returned no message confirmation." }),
      });
    } catch {
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...a,
        status: "uncertain",
        error:
          "Send confirmation was interrupted. Check the email provider before retrying.",
      });
    }
    return null;
  },
});
