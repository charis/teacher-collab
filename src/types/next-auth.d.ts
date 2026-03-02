// Library imports
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id?: string;
            isAdmin?: boolean;
        } & DefaultSession["user"]; // keep name, email, image
    }

    interface User {
        id?: string;
        isAdmin?: boolean;
    }
}
