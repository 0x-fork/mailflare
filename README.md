<p align="center">
  <img src="public/icon-96.png" alt="Mailflare" width="72" />
</p>

# Mailflare

A self-hosted alternative to Google Workspace. Setup **custom domain Emails**, **Calendar, Drive, Booking** and **built-in AI agents**.

Run it on Cloudflare or Docker. Send and receive with Cloudflare, Resend or Amazon SES. Store files in R2, Backblaze B2 or AWS S3. Use D1, Postgres, MySQL or Turso for the database.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hieunc229/mailflare)

## Screenshots

<table>
  <tr>
    <td align="center"><img src="screenshots/1.png" alt="Inbox" width="320"><br>Inbox</td>
    <td align="center"><img src="screenshots/2.png" alt="Manage domains" width="320"><br>Domains</td>
    <td align="center"><img src="screenshots/3.png" alt="Manage inboxes" width="320"><br>Mailboxes</td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/4.png" alt="Calendar" width="320"><br>Calendar</td>
    <td align="center"><img src="screenshots/5.png" alt="Booking" width="320"><br>Booking</td>
    <td align="center"><img src="screenshots/6.png" alt="Drive" width="320"><br>Drive</td>
  </tr>
</table>

### Sponsors

<a target="_blank" href="https://sequenzy.com/?ref=hieunc229/mailflare"><img height="80" src="sponsors/sequenzy.png" alt="Sequenzy"></a>
&nbsp;
<a target="_blank" href="https://drivemug.com/?ref=hieunc229/mailflare"><img height="80" src="sponsors/drivemug.png" alt="Drivemug"></a>

Want to support Mailflare? [Become a sponsor](https://store.paymug.co/buy/mailflare-sponsor).

## Features

- **Custom domain emails**: Managed via your Cloudflare domains
- **Mailboxes**: Rich-features mailbox, personal or shared, with access you control.
- **Email**: Attachments, rich text, signatures, auto-replies, search, folders, snooze and spam filtering.
- **Routing rules**: Store, forward, reject or sort incoming mail.
- **Calendar and Booking**: Repeating events, invitations, and a public page for booking time with you.
- **Drive**: Store and share files with Cloudflare D1, BackBlaze B2, or AWS S3
- **AI agents**: Search mail, draft replies and manage events. Connect other AI tools over MCP.
- **Admin**: Users, API keys, webhooks, audit logs and backups.
- **Import**: Bring in mail from IMAP, Gmail Takeout, `.eml` and `.mbox` files.

Support 34 languages, including English, Português (Brasil), Português (Portugal), Español, Français, Deutsch, Italiano, Nederlands, Polski, Українська, Русский, Türkçe, 中文（简体）, 日本語, 한국어, Bahasa Indonesia, Bahasa Melayu, Tiếng Việt, ไทย, हिन्दी, বাংলা, मराठी, తెలుగు, தமிழ், ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, සිංහල, Kiswahili, Hausa, plus العربية, اردو and فارسی (right-to-left).

## Cost

You can receive and send mail for free.

- **Receiving**: Cloudflare Email Routing is free.
- **Sending**: Use the free tier of Resend (3,000 emails a month) or Amazon SES. Cloudflare's own sending needs the $5/month Paid Worker plan.

New Amazon SES accounts start in a sandbox. Ask AWS for production access to lift it. Prices change, so check [Resend](https://resend.com/pricing), [Amazon SES](https://aws.amazon.com/ses/pricing/) and [Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).

## Deploy

1. **Deploy the app.** Click **Deploy to Cloudflare**. Keep the app name `mailflare`, or it will break.
2. **Finish setup.** Open the app at `/setup` and create your admin account.
3. **Connect a domain.** Add a domain from the same Cloudflare account, then create your first mailbox.

> **`CF_TOKEN` is required.** Create a scoped [Cloudflare API token](https://github.com/hieunc229/mailflare/issues/24#issuecomment-5523686105) with these permissions:
>
> - All accounts: Email Sending:Edit, DNS Settings:Edit, Email Routing Addresses:Edit
> - All zones: DNS Settings:Edit, Email Routing Rules:Edit, Zone Settings:Edit, DNS:Edit

More options: [deployment guide](docs/deployment.md), [deploy with an AI coding agent](docs/deployment.md#deploy-with-an-ai-coding-agent).

### Self-host with Docker

Runs as one container on any server, with SQLite and local files.

```bash
cp .env.docker.example .env.docker
docker compose up -d --build
```

See [self-hosting](docs/self-hosting.md).

## Local development

```bash
cp .dev.vars.example .dev.vars
npm install
npm run db:migrate:local
npm run dev
```

Add your Cloudflare credentials to `.dev.vars`, then open [localhost:3000](http://localhost:3000). Run `npm run db:seed` to load sample data.

- `npm run build`: build the Worker
- `npm run deploy`: build and deploy
- `npm run lint`: lint and type check

A schema change needs a migration for each database type. See [Databases](docs/databases.md#migrations).

## Documentation

- [Deployment and configuration](docs/deployment.md)
- [Databases](docs/databases.md)
- [Sending and receiving providers](docs/providers.md)
- [API and integrations](docs/api.md)
- [Email assistant and MCP](docs/email-assistant-and-mcp.md)
- [Adding a language](docs/localization.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

See [LICENSE](LICENSE).
