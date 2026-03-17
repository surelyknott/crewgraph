# CrewGraph

CrewGraph is an interactive collaboration-network explorer for film and TV crew members. It models `Crew`, `Production`, and `Credit` relationships in MongoDB, exposes graph-oriented API endpoints with Express, and renders an explorable force-directed graph in the browser with Force Graph.

Live app: `https://crewgraph.onrender.com/`

## What It Does

- Search for crew members and load their collaboration network
- Visualize crew relationships as a draggable, zoomable graph
- Show shared productions for the selected crew member
- Find the shortest collaboration path between two crew members
- Animate and highlight the discovered path in the graph
- Support a mobile-aware UI with collapsible panels

## Tech Stack

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- Vanilla HTML, CSS, and JavaScript
- Force Graph via CDN

## Architecture

CrewGraph stores normalized source data in three collections:

- `Crew`
- `Production`
- `Credit`

The frontend does not receive a full database dump. It loads:

- the crew directory for search
- a selected crew member's collaboration network on demand
- a shortest-path result on demand

The graph you see in the browser is derived from those API responses rather than stored as a static JSON file.

## Project Structure

```text
.
├── controllers/
├── models/
├── routes/
├── scripts/
├── utils/
├── app.js
├── server.js
├── index.html
├── style.css
└── script.js
```

## Data Model

### Crew

- `name`
- `role`
- `avatar`
- `createdAt`

### Production

- `title`
- `year`
- `tmdbId`
- `createdAt`

### Credit

- `crewId`
- `productionId`
- `role`

## API Endpoints

### `GET /health`

Basic health check.

### `GET /crew`

Returns the crew directory.

### `GET /crew/:id`

Returns a single crew member and their credits.

### `GET /crew/:id/collaborators`

Returns collaborators, collaboration counts, and shared productions for a crew member.

### `GET /crew/:id/network`

Returns a network payload centered on the selected crew member. The current implementation is an ego network built from that crew member's productions and direct collaborators.

### `GET /connection/:crewA/:crewB`

Returns the shortest collaboration path between two crew members using Breadth-First Search.

Example response:

```json
{
  "degrees": 3,
  "path": [
    { "_id": "a", "name": "Avery Vale", "role": "Director" },
    { "_id": "b", "name": "Finley Ellison", "role": "Producer" },
    { "_id": "c", "name": "Jordan Cross", "role": "Editor" },
    { "_id": "d", "name": "Jules Archer", "role": "Composer" }
  ],
  "segments": [
    {
      "source": "a",
      "target": "b",
      "sharedCredits": 2,
      "production": {
        "_id": "p1",
        "title": "Dune: Part Two",
        "year": 2024,
        "tmdbId": 693134
      }
    }
  ]
}
```

## Seed Data

The seed script currently creates:

- 30 crew members
- 15 productions
- a random set of credits connecting them

Productions are curated real titles with real TMDB IDs. Crew members are fictional.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/crewgraph?appName=<app-name>
PORT=3000
```

Notes:

- Include the database name in the path, for example `/crewgraph`
- `PORT` is only needed locally

### 3. Seed the database

```bash
npm run seed
```

### 4. Start the app

Development:

```bash
npm run dev
```

Production-style local start:

```bash
npm start
```

Then open:

- `http://localhost:3000/`

## Deployment

CrewGraph is deployed as a single Render Web Service.

### Render settings

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Required environment variable:

```env
MONGODB_URI=<your MongoDB Atlas connection string>
```

Notes:

- Render provides `PORT` automatically
- MongoDB Atlas must allow Render to connect
- for a quick dev deployment, Atlas network access may need `0.0.0.0/0`

## Frontend Notes

- The frontend is served directly by Express
- Force Graph is loaded via CDN from `unpkg`
- The browser uses `window.location.origin` in deployment and `http://localhost:3000` when opened from `file://`

## Tradeoffs And Scaling Notes

This project is designed as a portfolio/demo application, not a production-scale graph platform.

Current tradeoffs:

- `/crew/:id/network` returns a direct collaboration ego network, not an arbitrarily deep graph
- `/connection/:crewA/:crewB` currently rebuilds a collaboration adjacency map in memory per request
- the full crew directory is sent to the frontend for search

That is acceptable for the current seeded dataset. If this were scaled up, the next improvements would be:

- indexed credit lookups
- server-side search instead of loading all crew upfront
- frontier-based traversal for shortest path
- cached or precomputed collaboration adjacency

## Why MongoDB Here?

For a tiny fixed dataset, a static JSON file would be simpler. MongoDB is being used here because the project is demonstrating:

- normalized data modeling
- graph derivation from relational-style source data
- graph-oriented API design
- shortest-path traversal over collaboration relationships

## Portfolio Framing

CrewGraph is a strong portfolio project because it demonstrates more than CRUD:

- data modeling
- API design
- graph traversal with BFS
- interactive visualization
- deployment and environment management
- product thinking around exploration and usability

## License

ISC
