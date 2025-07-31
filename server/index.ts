// Minimal server for frontend serving - API calls routed to microservices
import express from "express";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Serve static frontend files
app.use(express.static('dist'));

// Proxy API requests to microservices API Gateway
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000', // API Gateway port
  changeOrigin: true,
  onError: (err, req, res) => {
    console.log('Microservices not available - starting Docker services...');
    res.status(503).json({ 
      error: 'Microservices starting', 
      message: 'Please wait while services are initializing' 
    });
  }
}));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

const server = createServer(app);
const port = process.env.PORT || 5000;

server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server running on port ${port}`);
  console.log('API requests will be proxied to microservices');
});