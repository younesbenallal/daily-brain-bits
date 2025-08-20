import { CronJob } from "cron";
import { db } from "../database/connection";
import { integrations } from "../database/schemas";
import { user } from "../auth/auth.schema";
import { eq, and } from "drizzle-orm";
import { notionPageService } from "../notion-page/notion-page.service";

export class DailyEmailCronService {
  private cronJob: CronJob | null = null;

  constructor() {}

  start() {
    if (this.cronJob) {
      return;
    }

    this.cronJob = new CronJob(
      "* * * * *",
      async () => {
        await this.sendDailyEmailsToAllUsers();
      },
      null,
      true,
      "Europe/Paris"
    );
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  async sendDailyEmailsToAllUsers(): Promise<void> {
    try {
      const usersWithNotionIntegrations =
        await this.getAllUsersWithNotionIntegrations();

      if (usersWithNotionIntegrations.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        usersWithNotionIntegrations.map((user) =>
          this.sendDailyEmailToUser(user)
        )
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const user = usersWithNotionIntegrations[index];
          console.error(
            `❌ Failed to send email to user ${user.email}:`,
            result.reason
          );
        }
      });
    } catch (error) {
      console.error("💥 Critical error in daily email process:", error);
    }
  }

  private async getAllUsersWithNotionIntegrations(): Promise<
    Array<{
      userId: string;
      email: string;
      integrationId: string;
      accessToken: string;
    }>
  > {
    try {
      const result = await db
        .select({
          userId: integrations.userId,
          email: user.email,
          integrationId: integrations.id,
          accessToken: integrations.accessToken,
        })
        .from(integrations)
        .innerJoin(user, eq(integrations.userId, user.id))
        .where(and(eq(integrations.type, "notion"), eq(user.isActive, true)));

      return result.filter((integration) => integration.accessToken);
    } catch (error) {
      console.error("❌ Error fetching users with Notion integrations:", error);
      return [];
    }
  }

  private async sendDailyEmailToUser(user: {
    userId: string;
    email: string;
    integrationId: string;
    accessToken: string;
  }): Promise<void> {
    try {
      const result = await notionPageService.sendRandomPageByEmail(
        user.integrationId,
        user.email,
        undefined
      );
    } catch (error) {
      console.error(`❌ Failed to send daily email to ${user.email}:`, error);
      throw error;
    }
  }

  async testSendToAllUsers(): Promise<void> {
    await this.sendDailyEmailsToAllUsers();
  }

  async sendNow(): Promise<void> {
    await this.sendDailyEmailsToAllUsers();
  }

  getStatus(): { running: boolean; nextRun?: Date; schedule: string } {
    if (!this.cronJob) {
      return {
        running: false,
        schedule: "Not running",
      };
    }

    return {
      running: !!this.cronJob,
      nextRun: this.cronJob.nextDate()?.toJSDate(),
      schedule: "Every minute (TEST MODE)",
    };
  }

  switchToProductionSchedule() {
    if (this.cronJob) {
      this.stop();
    }

    this.cronJob = new CronJob(
      "0 9 * * *",
      async () => {
        await this.sendDailyEmailsToAllUsers();
      },
      null,
      true,
      "Europe/Paris"
    );
  }

  async updateNotion() {
    const usersWithNotionIntegrations =
      await this.getAllUsersWithNotionIntegrations();

    for (const user of usersWithNotionIntegrations) {
      await notionPageService.syncNotionPages(user.integrationId);
    }
  }
}

export const dailyEmailCronService = new DailyEmailCronService();
