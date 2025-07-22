# Docker Deployment for AgentHub

This guide covers how to deploy the AgentHub SaaS platform using Docker.

## Quick Start

### Production Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Or build and run manually:**
```bash
# Build the image
docker build -t agenthub .

# Run the container
docker run -d -p 5000:5000 --name agenthub agenthub
```

### Development Environment

```bash
# Run development environment with hot reload
docker-compose -f docker-compose.dev.yml up
```

## Configuration

### Environment Variables

The application supports the following environment variables:

- `NODE_ENV` - Set to "production" for production deployment
- `PORT` - Port to run the application (default: 5000)
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud Project ID for BigQuery
- `BIGQUERY_DATASET_ID` - BigQuery dataset name
- `BIGQUERY_LOCATION` - BigQuery location (e.g., "US")
- `BIGQUERY_AGENTS_TABLE` - Agents table name
- `BIGQUERY_CONVERSATIONS_TABLE` - Conversations table name

### BigQuery Setup

For production deployment with BigQuery:

1. Create a Google Cloud service account with BigQuery permissions
2. Download the service account JSON key
3. Mount it in the container:
```yaml
volumes:
  - ./service-account.json:/app/service-account.json:ro
environment:
  - GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
```

## Image Details

- **Base Image:** Node.js 20 Alpine Linux
- **Size:** ~150MB (optimized with multi-stage build)
- **Security:** Runs as non-root user
- **Health Check:** Built-in health monitoring
- **Port:** 5000

## Production Considerations

### Scaling
```bash
# Scale with Docker Compose
docker-compose up -d --scale agenthub=3

# Or use with orchestration platforms like Kubernetes
```

### Monitoring
The container includes health checks accessible at:
- Health endpoint: `GET /api/agents`
- Docker health status: `docker ps` shows health status

### Data Persistence
- Uses BigQuery for production data storage
- No local volumes needed for data persistence
- Configure BigQuery connection via environment variables

### Security
- Container runs as non-privileged user
- Only exposes port 5000
- No sensitive data in image layers
- Use secrets/environment variables for API keys

## Troubleshooting

### Common Issues

1. **Container won't start:**
```bash
docker logs agenthub
```

2. **Health check failing:**
```bash
docker inspect --format='{{.State.Health}}' agenthub
```

3. **BigQuery connection issues:**
- Verify service account permissions
- Check environment variable configuration
- Ensure JSON key file is properly mounted

### Debug Mode
```bash
# Run with interactive shell
docker run -it --rm agenthub sh

# Check application logs
docker logs -f agenthub
```

## Building Custom Images

### Multi-architecture builds
```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t agenthub .
```

### Optimization
The Dockerfile includes several optimizations:
- Multi-stage build process
- Alpine Linux for smaller size
- Layer caching for faster builds
- Production-only dependencies

## Integration Examples

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agenthub
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agenthub
  template:
    metadata:
      labels:
        app: agenthub
    spec:
      containers:
      - name: agenthub
        image: agenthub:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
```

### Docker Swarm
```bash
# Deploy as a service
docker service create \
  --name agenthub \
  --publish 5000:5000 \
  --replicas 3 \
  agenthub:latest
```