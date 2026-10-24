import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(3, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const taskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);
export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(120, "Title must be at most 120 characters"),
    description: z.string().max(2000, "Description must be at most 2000 characters").optional(),
    workDeadline: z.coerce.date({
      errorMap: () => ({ message: "Enter a valid work deadline" }),
    }),
    taskDeadline: z.coerce.date({
      errorMap: () => ({ message: "Enter a valid task deadline" }),
    }),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
  })
  .refine((data) => data.workDeadline.getTime() <= data.taskDeadline.getTime(), {
    message: "Work deadline must be on or before the task deadline",
    path: ["workDeadline"],
  });

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .nullable(),
  workDeadline: z.coerce
    .date({
      errorMap: () => ({ message: "Enter a valid work deadline" }),
    })
    .optional(),
  taskDeadline: z.coerce
    .date({
      errorMap: () => ({ message: "Enter a valid task deadline" }),
    })
    .optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});
