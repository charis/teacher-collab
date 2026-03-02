// Library imports
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Custom imports
import { LOGIN_URL } from "@/constants";

const credentialsProvider = CredentialsProvider({
    name: "TeacherCollab Credentials",
    credentials: {
        username: {
            label: "Email:",
            type: "text",
            placeholder: "Type your e-mail here",
        },
        password: {
            label: "Password:",
            type: "password",
            placeholder: "Type your password here",
        },
    },
    // Authorization logic
    async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
            return null;
        }
        
        try {
            const res = await fetch(LOGIN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password,
                }),
            });
            
            if (!res.ok) {
                return null;
            }
            
            const user = await res.json();
            if (!user) {
                return null;
            }
            
            // Must return a valid user object or null
            return user;
        }
        catch (error) {
            console.error("Authorize error:", error);
            return null;
        }
    },
});

export const authOptions: NextAuthOptions  = {
    // Authentication Providers
    providers: [credentialsProvider],
    
    // Callback overrides
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (trigger === "signIn" && user) {
                // On sign-in, add the user data from `authorize` to the token.
                // It's important to merge the user data correctly to avoid type conflicts.
                return { ...token, ...user };
            }
            // If the trigger isn't "signIn", just return the existing token.
            return token;
        },
        
        async session({ session, token }) {
            if (!session.user) {
                session.user = {
                    name : null,
                    email: null,
                    image: null,
                    id   : undefined 
                };
            }
            
            if (typeof token.id === "string") {
                session.user.id = token.id;
            }
            if (typeof token.name === "string") {
                session.user.name = token.name;
            }
            if (typeof token.email === "string") {
                session.user.email = token.email;
            }
            if (typeof token.isAdmin === "boolean") {
                session.user.isAdmin = token.isAdmin;
            }

            return session;
          }
    },
    
    // Custom sign-in page
    pages: {
        signIn: "/auth",
    },
    
    // Session settings (optional)
    session: {
        strategy: "jwt",
    },
};
