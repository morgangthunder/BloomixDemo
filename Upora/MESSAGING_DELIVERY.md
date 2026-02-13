# Messaging delivery (Phase 6.5)

## Current behaviour

- **In-app**: Messages are stored as notifications (`type = 'direct_message'`). Recipients see them when they open **💬 Messages** (User Management or any place that opens the Messages modal in “all messages” mode). They appear under the **Received** tab.
- **Real-time in-app**: When a message is created, the backend emits a `new_message` event over Socket.io to the recipient’s user room. If the recipient’s client has:
  1. Connected to the WebSocket (e.g. they’ve opened User Management, which calls `connect()` and `joinUserRoom(userId)`),
  2. Joined their user room via `join-user` with their `userId`,
  then they receive the event immediately and the **💬 Messages** unread badge can update without refresh.
- **Email**: Optional. The compose form has two checkboxes: **In-app message** (default on) and **Also send by email** (default off). Email is sent only when the sender checks "Also send by email" and the backend has an N8N webhook configured (see below).

## Configuring email (Super Admin)

Use **Super Admin → Messages & Email** to set the N8N webhook URL and optional “From” name/address. See **EMAIL_CREDENTIALS_GUIDE.md** for how to get SendGrid or SMTP credentials and import the N8N workflow.

## Enabling email via N8N

1. In N8N, create a workflow that (or import `n8n/workflows/upora-message-email.json`):
   - Starts with a **Webhook** node (HTTP method: POST).
   - Receives a JSON body with: `messageId`, `toUserId`, `toUserEmail`, `fromUserId`, `fromUserEmail`, `title`, `body`, `createdAt`.
   - Sends an email (e.g. with an **Email (SMTP)** or **SendGrid** node) to `toUserEmail` using `title` and `body` (and optionally `fromUserEmail`).
2. Copy the webhook URL produced by N8N (e.g. `https://your-n8n.example.com/webhook/xxxx`).
3. In the backend environment set:
   ```bash
   N8N_MESSAGES_WEBHOOK_URL=https://your-n8n.example.com/webhook/xxxx
   ```
4. Restart the backend. When a message is created **and** the sender checked "Also send by email", the backend POSTs the payload to this URL. Your N8N workflow can then send the actual email.

If `N8N_MESSAGES_WEBHOOK_URL` is not set, or the sender did not check "Also send by email", no webhook is called and no email is sent.

## Summary

| Channel        | When it works |
|----------------|----------------|
| In-app (modal) | Recipient opens **💬 Messages** and looks at **Received** tab. |
| Real-time      | Recipient has the app open on a page that connects the socket and joins their user room (e.g. User Management); unread badge updates when a new message arrives. |
| Email          | Only if the sender checks "Also send by email", `N8N_MESSAGES_WEBHOOK_URL` is set, and the N8N workflow sends the email. |
