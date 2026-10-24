import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import {
  TASK_REMINDERS_QUEUE_NAME,
  type TaskReminderJobData,
} from "@/lib/queue/task-reminder-queue";

console.log("[Worker Init] Starting Skedora Task Reminder Worker...");

const workerRedis = createRedisConnection("skedora-reminder-worker");

export async function processReminderJob(job: Job<TaskReminderJobData>) {
  const { taskId, reminderType, scheduledFor } = job.data;
  const attempt = job.attemptsMade + 1;

  console.info(
    `[Worker] Processing job ${job.id} (Attempt ${attempt}/${job.opts.attempts ?? 1}): Task ID ${taskId}, Type ${reminderType}`
  );

  // 1. Fetch task from database along with user details
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
    },
  });

  // 2. Verify task existence
  if (!task) {
    console.warn(`[Worker] Task ${taskId} not found in database. Skipping reminder.`);
    return { status: "skipped", reason: "TASK_NOT_FOUND" };
  }

  // 3. Verify task eligibility (not completed)
  if (task.status === "COMPLETED") {
    console.info(`[Worker] Task ${taskId} is COMPLETED. Skipping reminder.`);
    return { status: "skipped", reason: "TASK_COMPLETED" };
  }

  // 4. Verify deadline consistency
  const currentDeadline =
    reminderType === "WORK_DEADLINE" ? task.workDeadline : task.taskDeadline;

  if (!currentDeadline) {
    console.warn(`[Worker] Task ${taskId} has no deadline for ${reminderType}. Skipping.`);
    return { status: "skipped", reason: "NO_DEADLINE" };
  }

  const scheduledTime = new Date(scheduledFor).getTime();
  const actualTime = new Date(currentDeadline).getTime();

  // If the task deadline was modified and differs by more than 1 second, this is a stale job
  if (!isNaN(scheduledTime) && Math.abs(actualTime - scheduledTime) > 1000) {
    console.info(
      `[Worker] Task ${taskId} ${reminderType} was rescheduled (scheduled for ${scheduledFor}, actual is ${currentDeadline.toISOString()}). Skipping stale job.`
    );
    return { status: "skipped", reason: "DEADLINE_CHANGED" };
  }

  // 5. Trigger notification (Requirement 15: log task ID and reminder type)
  console.log(
    `\n============================================================\n` +
      `[TASK REMINDER TRIGGERED]\n` +
      `  Task ID:       ${task.id}\n` +
      `  Reminder Type: ${reminderType}\n` +
      `  Title:         "${task.title}"\n` +
      `  Deadline:      ${currentDeadline.toISOString()}\n` +
      `  Status:        ${task.status}\n` +
      `  Priority:      ${task.priority}\n` +
      `  Recipient:     ${task.user.username} <${task.user.email}>\n` +
      `  Trigger Time:  ${new Date().toISOString()}\n` +
      `============================================================\n`
  );

  return {
    status: "delivered",
    taskId: task.id,
    reminderType,
    deliveredAt: new Date().toISOString(),
  };
}

export const reminderWorker = new Worker<TaskReminderJobData>(
  TASK_REMINDERS_QUEUE_NAME,
  processReminderJob,
  {
    connection: workerRedis,
    concurrency: 5,
    lockDuration: 30000,
  }
);

reminderWorker.on("ready", () => {
  console.log(`[Worker Ready] Listening for reminder jobs on queue: "${TASK_REMINDERS_QUEUE_NAME}"`);
});

reminderWorker.on("active", (job) => {
  console.log(`[Worker Active] Started processing job ${job.id} for task ${job.data.taskId}`);
});

reminderWorker.on("completed", (job, returnvalue) => {
  console.log(
    `[Worker Completed] Finished job ${job.id} for task ${job.data.taskId} (${job.data.reminderType}). Status: ${returnvalue?.status}`
  );
});

reminderWorker.on("failed", (job, err) => {
  console.error(
    `[Worker Failed] Job ${job?.id} failed for task ${job?.data.taskId}. Attempt ${
      (job?.attemptsMade ?? 0)
    }/${job?.opts.attempts ?? 1}. Error: ${err.message}`
  );
});

reminderWorker.on("error", (err) => {
  console.error("[Worker Redis Error]:", err.message || err);
});

// Graceful shutdown handlers
let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Worker Shutdown] Received ${signal}. Closing worker gracefully...`);
  try {
    await reminderWorker.close();
    await workerRedis.quit();
    await prisma.$disconnect();
    console.log("[Worker Shutdown] Clean shutdown complete.");
    process.exit(0);
  } catch (error) {
    console.error("[Worker Shutdown] Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
