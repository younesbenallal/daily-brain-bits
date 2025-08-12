import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/modules/database/connection";
import * as authSchemas from "./src/modules/auth/auth.schema";
import { Resend } from "resend";

// Initialiser Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email autorisé pour les tests Resend
const RESEND_TEST_EMAIL = "benallalayoub@gmail.com";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchemas.user,
      session: authSchemas.session,
      account: authSchemas.account,
      verification: authSchemas.verification,
    },
  }),
  secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-here",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
  cookies: {
    secure: false,
    sameSite: "lax",
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log("🔍 Better Auth signIn callback:", {
        user: user.email,
        account: account?.provider,
      });
      return true;
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      try {
        console.log("📧 Sending verification email to:", user.email);
        console.log("🔗 Verification URL:", url);

        // En développement, rediriger tous les emails vers l'email autorisé
        const emailTo =
          process.env.NODE_ENV === "development"
            ? RESEND_TEST_EMAIL
            : user.email;

        console.log(
          `📧 Redirecting email from ${user.email} to ${emailTo} (dev mode)`
        );

        const { data, error } = await resend.emails.send({
          from: "Acme <onboarding@resend.dev>",
          to: [emailTo],
          subject: "Vérifiez votre email - Daily Brain Bits",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Vérification Email</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                .dev-notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🧠 Daily Brain Bits</h1>
                </div>
                <div class="content">
                  ${
                    process.env.NODE_ENV === "development"
                      ? `
                    <div class="dev-notice">
                      <strong>🚧 Mode Développement</strong><br>
                      Cet email était destiné à: <strong>${user.email}</strong><br>
                      Mais a été redirigé vers votre email de test Resend.
                    </div>
                  `
                      : ""
                  }
                  
                  <h2>Bienvenue ${user.name} !</h2>
                  <p>Merci de vous être inscrit à Daily Brain Bits. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
                  
                  <div style="text-align: center;">
                    <a href="${url}" class="button">Vérifier mon email</a>
                  </div>
                  
                  <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
                  <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${url}</p>
                  
                  <p><strong>Ce lien expire dans 24 heures.</strong></p>
                  
                  <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
                </div>
                <div class="footer">
                  <p>Daily Brain Bits - Votre dose quotidienne de connaissances</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (error) {
          console.error("❌ Resend error:", error);
          throw new Error(`Failed to send email: ${error.message}`);
        }

        console.log("✅ Verification email sent successfully:", data?.id);
        return { success: true };
      } catch (error) {
        console.error("❌ Error sending verification email:", error);
        throw error;
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
