# MyPA API Documentation

This dashboard includes several API endpoints for interacting with tasks.

## 1. Export Tasks API
Exports tasks based on their status in the Kanban board.

- **Endpoint:** `GET /api/tasks/export`
- **Query Parameters:**
  - `status`: One of `todo`, `doing`, or `done`.
- **Response:** JSON array of task objects.
- **Example:**
  ```bash
  curl "http://localhost:3000/api/tasks/export?status=done"
  ```

## 2. Update Tasks API
Updates or deletes a specific task.

- **Endpoint:** `POST /api/tasks/update`
- **Request Body:**
  ```json
  {
    "action": "move" | "delete",
    "taskId": "task-id-here",
    "nextStatus": "todo" | "doing" | "done" (required for "move")
  }
  ```
- **Response:** JSON success/error message.
- **Example:**
  ```bash
  curl -X POST http://localhost:3000/api/tasks/update \
    -H "Content-Type: application/json" \
    -d '{ "action": "move", "taskId": "123", "nextStatus": "doing" }'
  ```

## UI Integration
The sidebar now includes two buttons for quick testing:
- **📤 Export API:** Fetches tasks with "done" status and downloads them as a JSON file.
- **🔄 Update API:** Automatically attempts to move the first task in the list to the "doing" column (for demonstration).
