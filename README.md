# Skedora

Skedora is an application where users can add tasks with deadline patterns. When a task deadline is near, the app sends a notification for that task.

Deadlines work in two ways:

- **Work deadline** — due date for a work item
- **Task deadline** — due date for an individual task

The current build includes authentication and task management. Notification features will be added next.

## API routes

### `POST /api/auth/register`

Creates a new user with username, email, and password, then signs them in.

### `POST /api/auth/login`

Authenticates an existing user with email and password and starts a session.

### `POST /api/auth/logout`

Ends the current session and clears the auth cookie.

### `GET /api/auth/me`

Returns the currently signed-in user. Returns 401 if there is no valid session.

### `GET /api/tasks`

Lists tasks for the signed-in user. Optional `status` query: `PENDING`, `IN_PROGRESS`, or `COMPLETED`.

### `POST /api/tasks`

Creates a task for the signed-in user with title, description, work deadline, task deadline, status, and priority.

### `GET /api/tasks/:id`

Returns one task owned by the signed-in user. Returns 404 if it is missing or belongs to another user.

### `PATCH /api/tasks/:id`

Updates an owned task. Returns 404 if it is missing or belongs to another user.

### `DELETE /api/tasks/:id`

Deletes an owned task. Returns 404 if it is missing or belongs to another user.

### `PATCH /api/tasks/:id/status`

Updates only the status of an owned task.
