import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private resend: Resend;
  private testEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.testEmail = process.env.RESEND_TEST_EMAIL || "benallalayoub@gmail.com";
  }

  async sendEmail(
    options: EmailOptions
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      console.log("📧 Sending email via Resend...");
      console.log(`📬 To: ${options.to}`);
      console.log(`📝 Subject: ${options.subject}`);

      const emailTo =
        process.env.NODE_ENV === "development" ? this.testEmail : options.to;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔄 Redirecting email from ${options.to} to ${emailTo} (dev mode)`
        );
      }

      const { data, error } = await this.resend.emails.send({
        from: "Daily Brain Bits <onboarding@resend.dev>",
        to: [emailTo],
        subject: options.subject,
        html: this.addDevNotice(options.html, options.to),
      });

      if (error) {
        console.error("❌ Resend error:", error);
        return {
          success: false,
          error: error.message || "Failed to send email",
        };
      }

      console.log("✅ Email sent successfully:", data?.id);
      return {
        success: true,
        id: data?.id,
      };
    } catch (error) {
      console.error("❌ Error in email service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private addDevNotice(html: string, originalTo: string): string {
    if (process.env.NODE_ENV !== "development") {
      return html;
    }

    const devNotice = `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <strong>🚧 Mode Développement</strong><br>
        Cet email était destiné à: <strong>${originalTo}</strong><br>
        Mais a été redirigé vers votre email de test Resend.
      </div>
    `;

    if (html.includes("<body>")) {
      return html.replace("<body>", `<body>${devNotice}`);
    } else {
      return devNotice + html;
    }
  }

  createEmailTemplate(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
        }
        .content { 
            background: #ffffff; 
            padding: 30px; 
            border: 1px solid #e0e0e0;
        }
        .footer { 
            background: #f9f9f9;
            text-align: center; 
            padding: 20px; 
            color: #666; 
            font-size: 14px; 
            border-radius: 0 0 8px 8px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
        }
        .highlight-box {
            background: #f0f7ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 6px 6px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Daily Brain Bits</h1>
            <p>Your daily dose of knowledge from Notion</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>📧 Sent by Daily Brain Bits</p>
            <p>Keep learning, one page at a time! 🚀</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
}

export const emailService = new EmailService();
