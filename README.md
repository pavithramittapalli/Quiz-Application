# ChalkQuiz — Quiz Performance System

A category-based quiz app with a live timer, score tracking, and a leaderboard, backed by an Express + MongoDB API.

## Features
- Sign up / log in (passwords hashed with bcrypt)
- Timed quiz rounds across multiple categories (Reasoning, Quantitative, Relations, G.K., History)
- Live score tracking and a global leaderboard
- Chalkboard-themed UI

## Tech stack
- **Frontend:** HTML, Tailwind CSS (CDN), vanilla JS
- **Backend:** Node.js, Express 5
- **Database:** MongoDB (via Mongoose)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and adjust if needed:
   ```bash
   cp .env.example .env
   ```

3. Make sure MongoDB is running locally (or point `MONGO_URI` in `.env` at your own instance).

4. Start the server:
   ```bash
   npm start
   ```

5. Open `index.html` in a browser (or serve it with any static file server).

## Project structure
```
index.html      — app markup
styles.css      — chalkboard theme styles
index.js        — frontend logic (screens, quiz flow, API calls)
server.js       — Express API (signup, login, score, leaderboard)
package.json    — dependencies and scripts
.env.example    — required environment variables
```
