# Nginx Reverse Proxy Setup

## ✅ Configuration Complete

Nginx has been configured as a reverse proxy so you can access your application without specifying port numbers.

## 🌐 Access Your Application

**Main URL**: http://152.42.239.238

No port number needed! The site is now accessible on the default HTTP port (80).

## 📋 What Was Configured

1. **Nginx installed** and running on port 80
2. **Reverse proxy** configured to forward:
   - `/` → Frontend (port 3000)
   - `/api` → Backend API (port 3001)
   - `/health` → Backend health check
3. **Firewall** updated to allow port 80 and 443
4. **React Router** support enabled for client-side routing

## 🔧 Configuration File

The Nginx configuration is located at:
- `/etc/nginx/sites-available/iot-web3`
- Symlinked to `/etc/nginx/sites-enabled/iot-web3`

## 🛠️ Management Commands

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Reload configuration (after changes)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔒 Next Steps (Optional)

### Set Up SSL/HTTPS

To enable HTTPS (recommended for production):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Or if using IP only, you can use a self-signed certificate
```

### Domain Name Setup

If you have a domain name:

1. Point your domain's A record to: `152.42.239.238`
2. Update Nginx config with your domain name
3. Get SSL certificate with Let's Encrypt

## ✅ Verification

Test these URLs:

- **Homepage**: http://152.42.239.238
- **API Health**: http://152.42.239.238/api/health
- **IoT Dashboard**: http://152.42.239.238/dashboard
- **Web3 Process**: http://152.42.239.238/web3
- **Control Panel**: http://152.42.239.238/control

All should work without port numbers!

