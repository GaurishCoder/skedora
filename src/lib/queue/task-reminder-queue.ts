import { Queue, type JobsOptions } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import type { TaskStatus } from "@/generated/prisma/client";

export const TASK_REMINDERS_QUEUE_NAME = "task-reminders";

export type ReminderType = "WORK_DEADLINE" | "TASK_DEADLINE";

export interface TaskReminderJobData {
  taskId: string;
  reminderType: ReminderType;
  scheduledFor: string;
}

export interface TaskReminderTarget {
  id: string;
  workDeadline: Date | string;
  taskDeadline: Date | string;
  status: TaskStatus;
}

export function getReminderJobId(taskId: string, type: ReminderType): string {
  return `reminder:${type === "WORK_DEADLINE" ? "work" : "task"}:${taskId}`;//remainder:work:123
}

const globalForQueue = globalThis as unknown as {
  taskReminderQueue?: Queue<TaskReminderJobData>;
};

export function getTaskReminderQueue(): Queue<TaskReminderJobData> {
  if (!globalForQueue.taskReminderQueue) {
    const redisClient = createRedisConnection("skedora-queue-client");
    globalForQueue.taskReminderQueue = new Queue<TaskReminderJobData>(
      TASK_REMINDERS_QUEUE_NAME,
      {
        connection: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: {
            age: 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 86400 * 7,
          },
        },
      }
    );
  }

  return globalForQueue.taskReminderQueue;
}

async function removeJobIfExists(queue: Queue<TaskReminderJobData>, jobId: string): Promise<void> {
  try {
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  } catch (error) {
    console.error(`[Reminder Queue] Error removing existing job ${jobId}:`, error);
  }
}

async function scheduleSingleReminder(
  queue: Queue<TaskReminderJobData>,
  taskId: string,
  type: ReminderType,
  deadline: Date | string
): Promise<void> {
  const dateObj = deadline instanceof Date ? deadline : new Date(deadline);
  const jobId = getReminderJobId(taskId, type);

  // Always remove existing job for this task + reminder type first
  await removeJobIfExists(queue, jobId);

  if (isNaN(dateObj.getTime())) {
    console.warn(`[Reminder Queue] Invalid date for task ${taskId} (${type}):`, deadline);
    return;
  }

  const now = Date.now();
  const delay = dateObj.getTime() - now;
  console.log("delay:",delay);

  if (delay <= 0) {
    console.info(
      `[Reminder Queue] Skipping past deadline for task ${taskId} (${type}) at ${dateObj.toISOString()}`
    );
    return;
  }

  const jobData: TaskReminderJobData = {
    taskId,
    reminderType: type,
    scheduledFor: dateObj.toISOString(),
  };

  const jobOptions: JobsOptions = {
    jobId,
    delay,
  };

  await queue.add(`task-reminder-${type.toLowerCase()}`, jobData, jobOptions);
  console.info(
    `[Reminder Queue] Scheduled ${type} reminder for task ${taskId} in ${Math.round(
      delay / 1000
    )}s (at ${dateObj.toISOString()})`
  );
}

/**
 * Schedule both work and task deadline reminders for a task.
 * If the task is completed, cancels any existing reminders instead.
 */
export async function scheduleTaskReminders(task: TaskReminderTarget): Promise<void> {
  if (task.status === "COMPLETED") {
    await cancelTaskReminders(task.id);
    return;
  }

  const queue = getTaskReminderQueue();
  await Promise.all([
    scheduleSingleReminder(queue, task.id, "WORK_DEADLINE", task.workDeadline),
    scheduleSingleReminder(queue, task.id, "TASK_DEADLINE", task.taskDeadline),
  ]);
}

/**
 * Cancel both pending reminders for a task (e.g. when completed or deleted).
 */
export async function cancelTaskReminders(taskId: string): Promise<void> {
  const queue = getTaskReminderQueue();
  const workJobId = getReminderJobId(taskId, "WORK_DEADLINE");
  const taskJobId = getReminderJobId(taskId, "TASK_DEADLINE");

  await Promise.all([
    removeJobIfExists(queue, workJobId),
    removeJobIfExists(queue, taskJobId),
  ]);

  console.info(`[Reminder Queue] Cancelled pending reminders for task ${taskId}`);
}
