import { env } from "./_generated/server";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Password({
      profile(params) {
        const email = String(params.email || "")
          .trim()
          .toLowerCase();
        if (!env.STAFF_EMAIL || email !== env.STAFF_EMAIL.toLowerCase())
          throw new ConvexError("This desk is invitation-only.");
        if (
          params.flow === "signUp" &&
          (!env.STAFF_ENROLLMENT_CODE ||
            params.invitation !== env.STAFF_ENROLLMENT_CODE)
        )
          throw new ConvexError("A valid store invitation is required.");
        return { email };
      },
    }),
  ],
});
