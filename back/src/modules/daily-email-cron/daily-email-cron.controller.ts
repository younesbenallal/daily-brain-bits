import { Context } from "hono";
import { dailyEmailCronService } from "./daily-email-cron.service";

export class DailyEmailCronController {
  // Démarrer le service de cron quotidien
  async startCronService(c: Context) {
    try {
      dailyEmailCronService.start();
      const status = dailyEmailCronService.getStatus();

      return c.json({
        message: "Daily email cron service started successfully",
        status,
        warning: "⚠️ RUNNING IN TEST MODE: Emails will be sent EVERY MINUTE",
        info: "Use /cron/daily-email/switch-to-production to change to daily schedule",
      });
    } catch (error) {
      console.error("❌ Error starting daily email cron:", error);
      return c.json({ error: "Failed to start cron service" }, 500);
    }
  }

  // Arrêter le service de cron quotidien
  async stopCronService(c: Context) {
    try {
      dailyEmailCronService.stop();
      return c.json({
        message: "Daily email cron service stopped successfully",
        status: dailyEmailCronService.getStatus(),
      });
    } catch (error) {
      console.error("❌ Error stopping daily email cron:", error);
      return c.json({ error: "Failed to stop cron service" }, 500);
    }
  }

  // Obtenir le statut du service de cron
  async getCronStatus(c: Context) {
    try {
      const status = dailyEmailCronService.getStatus();
      return c.json({
        status,
        info: status.running
          ? `Next email scheduled for: ${status.nextRun?.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
          : "Cron service is not running. Use POST /cron/daily-email/start to activate it.",
        schedule: status.schedule,
      });
    } catch (error) {
      console.error("❌ Error getting cron status:", error);
      return c.json({ error: "Failed to get cron status" }, 500);
    }
  }

  // Déclencher manuellement l'envoi d'emails (pour les tests)
  async sendEmailsNow(c: Context) {
    try {
      await dailyEmailCronService.sendNow();
      return c.json({
        message:
          "Daily emails sent successfully to all users with Notion integrations",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error sending daily emails:", error);
      return c.json(
        {
          error: "Failed to send daily emails",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Changer vers le planning de production (une fois par jour)
  async switchToProduction(c: Context) {
    try {
      dailyEmailCronService.switchToProductionSchedule();
      const status = dailyEmailCronService.getStatus();

      return c.json({
        message: "Successfully switched to PRODUCTION schedule",
        status,
        info: "Emails will now be sent daily at 9:00 AM (Europe/Paris)",
      });
    } catch (error) {
      console.error("❌ Error switching to production schedule:", error);
      return c.json({ error: "Failed to switch to production schedule" }, 500);
    }
  }

  // Tester le service avec un utilisateur spécifique (pour debug)
  async testWithUser(c: Context) {
    try {
      const { userEmail } = await c.req.json();

      if (!userEmail) {
        return c.json({ error: "userEmail is required in request body" }, 400);
      }

      await dailyEmailCronService.testSendToAllUsers();

      return c.json({
        message: `Test completed - check logs for details`,
        userEmail,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error testing daily email service:", error);
      return c.json(
        {
          error: "Failed to test daily email service",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Obtenir les logs récents (simulation)
  async getLogs(c: Context) {
    try {
      const status = dailyEmailCronService.getStatus();

      return c.json({
        message: "Cron service logs",
        status,
        logs: [
          "📧 Service initialized",
          status.running ? "✅ Cron job is running" : "⏹️ Cron job is stopped",
          `📅 Schedule: ${status.schedule}`,
          status.nextRun
            ? `⏰ Next run: ${status.nextRun.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
            : "No next run scheduled",
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting logs:", error);
      return c.json({ error: "Failed to get logs" }, 500);
    }
  }

  // Debug: Vérifier les utilisateurs avec intégrations Notion
  async debugUsers(c: Context) {
    try {
      const users = await (
        dailyEmailCronService as any
      ).getAllUsersWithNotionIntegrations();

      return c.json({
        message: "Debug: Users with Notion integrations",
        count: users.length,
        users: users.map((user) => ({
          userId: user.userId,
          email: user.email,
          integrationId: user.integrationId,
          hasToken: !!user.accessToken,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error debugging users:", error);
      return c.json(
        {
          error: "Failed to debug users",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Mettre à jour les pages Notion pour tous les utilisateurs
  async updateNotion(c: Context) {
    try {
      console.log("🔄 Starting Notion pages update for all users...");
      await dailyEmailCronService.updateNotion();

      return c.json({
        message: "Notion pages updated successfully for all users",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error updating Notion pages:", error);
      return c.json(
        {
          error: "Failed to update Notion pages",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
}

export const dailyEmailCronController = new DailyEmailCronController();
