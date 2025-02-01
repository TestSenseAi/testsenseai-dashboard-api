# TestSenseAI Dashboard API

Backend API for the TestSenseAI Dashboard, built with Nitric and TypeScript.

## Features

- 🔒 JWT-based authentication
- 🚀 Real-time updates via WebSocket
- 📊 Metrics and analytics endpoints
- 🤖 AI-powered test analysis
- 🔄 Rate limiting and caching
- 📝 Structured logging
- 🎯 Multi-tenant support

## Prerequisites

- Node.js >= 22.0.0
- Redis server
- Nitric CLI

## Setup

1 Clone the repository:

```bash
git clone https://github.com/your-org/testsenseai-dashboard-api.git
cd testsenseai-dashboard-api
```

2 Install dependencies:

```bash
npm install
```

3 Copy the environment file and update the values:

```bash
cp .env.example .env
```

4 Start Redis (if not already running):

```bash
docker run -d -p 6379:6379 redis
```

## Development

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

## API Documentation

### Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```javascript
Authorization: Bearer <your-token>
```

### Endpoints

#### Public

- `GET /health` - Health check endpoint

#### Protected

- `GET /me` - Get current user profile
- `GET /metrics/summary` - Get metrics summary
- `GET /metrics/trends` - Get metrics trends
- `GET /activities` - Get activity feed
- `GET /insights` - Get AI-generated insights
- `POST /insights/analyze` - Trigger new insight analysis

### WebSocket

Connect to `/updates` for real-time updates. Required events:

- `SUBSCRIBE_ACTIVITIES` - Subscribe to activity updates
- `SUBSCRIBE_INSIGHTS` - Subscribe to insight updates

## Deployment

Deploy to your cloud provider:

```bash
npm run deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
