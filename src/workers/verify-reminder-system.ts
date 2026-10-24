import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { createRedisConnection } from "@/lib/redis";
import {
  getTaskReminderQueue,
  scheduleTaskReminders,
  cancelTaskReminders,
  getReminderJobId,
  type TaskReminderJobData,
} from "@/lib/queue/task-reminder-queue";
import { processReminderJob, reminderWorker } from "@/workers/reminder-worker";
import type { Job } from "bullmq";

async function runVerificationTests() {
  console.log("=================================================");
  console.log("Starting Skedora Reminder System Verification Tests");
  console.log("=================================================\n");

  const queue = getTaskReminderQueue();

  // Test 1: Redis Connectivity
  console.log("[Test 1] Testing Redis Connection...");
  const redis = createRedisConnection("test-ping-client");
  const ping = await redis.ping();
  await redis.quit();
  if (ping !== "PONG") {
    throw new Error(`Expected PONG but got ${ping}`);
  }
  console.log("✓ Redis is connected and responsive.\n");

  // Create or retrieve test user
  console.log("[Setup] Ensuring test user in PostgreSQL...");
  const testEmail = "reminder_test_user@example.com";
  let user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: "reminder_test_user",
        email: testEmail,
        password: "hashedpassword123",
      },
    });
  }
  console.log(`✓ Test user verified (ID: ${user.id}).\n`);

  // Test 2: Task Creation & Scheduling 2 Independent Reminders
  console.log("[Test 2] Testing Task Creation & Scheduling...");
  const now = Date.now();
  const workDeadline = new Date(now + 3000); // 3s in future
  const taskDeadline = new Date(now + 6000); // 6s in future

  const task = await prisma.task.create({
    data: {
      title: "Test Queue Task",
      description: "Testing reminders",
      workDeadline,
      taskDeadline,
      status: "PENDING",
      priority: "HIGH",
      userId: user.id,
    },
  });

  await scheduleTaskReminders(task);

  const workJobId = getReminderJobId(task.id, "WORK_DEADLINE");
  const taskJobId = getReminderJobId(task.id, "TASK_DEADLINE");

  const workJob = await queue.getJob(workJobId);
  const taskJob = await queue.getJob(taskJobId);

  if (!workJob || !taskJob) {
    throw new Error("Failed to schedule work or task deadline reminder jobs!");
  }

  console.log(`✓ Both reminder jobs scheduled successfully:`);
  console.log(`  - Work Job ID: ${workJob.id}, Scheduled delay: ~${workJob.opts.delay}ms`);
  console.log(`  - Task Job ID: ${taskJob.id}, Scheduled delay: ~${taskJob.opts.delay}ms\n`);

  // Test 3: Worker safe processing of valid job
  console.log("[Test 3] Testing Worker safe processing of an eligible job...");
  const simulatedJob = {
    id: workJob.id,
    data: workJob.data,
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<TaskReminderJobData>;

  const processResult = await processReminderJob(simulatedJob);
  if (processResult?.status !== "delivered") {
    throw new Error(`Expected delivered status, got ${JSON.stringify(processResult)}`);
  }
  console.log("✓ Worker processed eligible job and verified task data.\n");

  // Test 4: Rescheduling when deadline changes
  console.log("[Test 4] Testing Rescheduling on Deadline Update...");
  const updatedWorkDeadline = new Date(now + 10000); // 10s in future
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: { workDeadline: updatedWorkDeadline },
  });

  await scheduleTaskReminders(updatedTask);

  const rescheduledWorkJob = await queue.getJob(workJobId);
  if (!rescheduledWorkJob) {
    throw new Error("Rescheduled work job was not found!");
  }
  if (rescheduledWorkJob.data.scheduledFor !== updatedWorkDeadline.toISOString()) {
    throw new Error(
      `Job scheduledFor not updated! Got ${rescheduledWorkJob.data.scheduledFor}, expected ${updatedWorkDeadline.toISOString()}`
    );
  }
  console.log(
    `✓ Rescheduled job updated correctly with new target deadline: ${rescheduledWorkJob.data.scheduledFor}\n`
  );

  // Test 5: Worker skips stale job when deadline was changed in DB
  console.log("[Test 5] Testing Worker skipping stale job when deadline changed in DB...");
  const staleJob = {
    id: workJob.id,
    data: {
      taskId: task.id,
      reminderType: "WORK_DEADLINE",
      scheduledFor: workDeadline.toISOString(), // old deadline
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<TaskReminderJobData>;

  const staleResult = await processReminderJob(staleJob);
  if (staleResult?.reason !== "DEADLINE_CHANGED") {
    throw new Error(`Expected DEADLINE_CHANGED, got ${JSON.stringify(staleResult)}`);
  }
  console.log("✓ Worker detected stale job and skipped delivery safely.\n");

  // Test 6: Task Completion Cancels Reminders
  console.log("[Test 6] Testing Invalidation on Task Completion...");
  const completedTask = await prisma.task.update({
    where: { id: task.id },
    data: { status: "COMPLETED" },
  });

  await cancelTaskReminders(completedTask.id);

  const pendingWorkJob = await queue.getJob(workJobId);
  const pendingTaskJob = await queue.getJob(taskJobId);

  if (pendingWorkJob || pendingTaskJob) {
    throw new Error("Pending jobs were not removed after task completion!");
  }
  console.log("✓ All pending reminders cancelled when task marked COMPLETED.\n");

  // Test 7: Worker skips completed task if job somehow reached it
  console.log("[Test 7] Testing Worker safety check on COMPLETED task...");
  const completedJobCheck = await processReminderJob(simulatedJob);
  if (completedJobCheck?.reason !== "TASK_COMPLETED") {
    throw new Error(`Expected TASK_COMPLETED, got ${JSON.stringify(completedJobCheck)}`);
  }
  console.log("✓ Worker verified task status and safely skipped completed task.\n");

  // Test 8: Task Deletion
  console.log("[Test 8] Testing Task Deletion & Non-existent task safety...");
  await prisma.task.delete({ where: { id: task.id } });
  await cancelTaskReminders(task.id);

  const nonExistentCheck = await processReminderJob(simulatedJob);
  if (nonExistentCheck?.reason !== "TASK_NOT_FOUND") {
    throw new Error(`Expected TASK_NOT_FOUND, got ${JSON.stringify(nonExistentCheck)}`);
  }
  console.log("✓ Worker safely handled deleted/non-existent task.\n");

  // Clean up test user
  await prisma.user.delete({ where: { id: user.id } });
  await reminderWorker.close();
  await queue.close();
  await prisma.$disconnect();

  console.log("=================================================");
  console.log("All Reminder System Verification Tests Passed! ✓");
  console.log("=================================================");
  process.exit(0);
}

runVerificationTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
