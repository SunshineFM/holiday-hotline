import { env } from "./_generated/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const send = internalAction({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.runMutation(
      internal.requests.claimDelivery,
      args,
    );
    if (!request) return null;
    const key = env.AGENTMAIL_API_KEY;
    const inbox = env.AGENTMAIL_INBOX_ID;
    if (!key || !inbox) {
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...args,
        status: "failed",
        error: "Email connection is not configured. Your response is saved.",
      });
      return null;
    }
    const data = await ctx.runQuery(internal.requests.deliveryData, args);
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
            to: [request.email],
            subject: `${data?.name ?? "Holiday Helper"}: your request`,
            text: `Hello ${request.shopper},\n\nA team member checked your request about ${request.item}.\n\n${request.answer}\n\n${data?.photoUrl ? `Photo: ${data.photoUrl}\n\n` : ""}This response reflects the information available when it was sent.\n\nHoliday Helper`,
            ...(data?.photoUrl
              ? {
                  attachments: [
                    { filename: "team-photo.jpg", url: data.photoUrl },
                  ],
                }
              : {}),
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok) {
        await ctx.runMutation(internal.requests.deliveryResult, {
          ...args,
          status: response.status >= 500 ? "uncertain" : "failed",
          error:
            "The email provider did not confirm the send. Check the provider before sending again.",
        });
        return null;
      }
      const body = (await response.json()) as { message_id?: string };
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...args,
        status: body.message_id ? "sent" : "uncertain",
        ...(body.message_id
          ? { messageId: body.message_id }
          : { error: "The email provider returned no message confirmation." }),
      });
    } catch {
      await ctx.runMutation(internal.requests.deliveryResult, {
        ...args,
        status: "uncertain",
        error:
          "Send confirmation was interrupted. Check the email provider before retrying.",
      });
    }
    return null;
  },
});
