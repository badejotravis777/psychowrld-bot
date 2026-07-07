# Psychowrld WhatsApp Bot

A full WhatsApp ordering bot built with Node.js, Express, MongoDB, and Meta Cloud API.

## Project Structure
```
psychowrld-bot/
├── index.js                        # Entry point
├── render.yaml                     # Render deployment config
├── .env.example                    # Environment variables template
└── src/
    ├── config/
    │   └── whatsapp.config.js      # WhatsApp API config
    ├── controllers/
    │   └── webhook.controller.js   # Incoming message handler
    ├── models/
    │   └── session.model.js        # Customer session/cart state
    ├── routes/
    │   └── webhook.routes.js       # Webhook GET/POST routes
    └── services/
        └── whatsapp.service.js     # Message sending helpers
```

## Setup

### 1. Clone and install
```bash
git clone <your-repo>
cd psychowrld-bot
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Meta Developer Setup
1. Go to https://developers.facebook.com
2. Create a new app → Business type
3. Add WhatsApp product
4. Get your Phone Number ID and Access Token
5. Set VERIFY_TOKEN to any string you choose (same one goes in Meta dashboard)

### 4. Run locally (with ngrok for webhook testing)
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# Copy the https URL → use as webhook URL in Meta dashboard
# Webhook URL format: https://xxxx.ngrok.io/webhook
```

### 5. Deploy to Render
- Push to GitHub
- Connect repo on Render
- Add all env vars in Render dashboard
- Your webhook URL will be: https://your-app.onrender.com/webhook

## Bot Flow (Phase 1)
- Customer messages the number
- Bot creates a session for them in MongoDB
- Customer is greeted with welcome menu (Order / Track / Agent)
- All state is tracked per WhatsApp number in the Session model

## Phases
- [x] Phase 1 — Setup & Infrastructure
- [ ] Phase 2 — Menu/Cart/Checkout
- [ ] Phase 3 — Payment Integration
- [ ] Phase 4 — Order & Delivery Tracking
- [ ] Phase 5 — Agent Handoff
- [ ] Phase 6 — FAQ
- [ ] Phase 7 — Push Notifications
- [ ] Phase 8 — Testing & Launch
