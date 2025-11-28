# Domain Configuration Complete

## ✅ SSL Certificate Installed

Your domain **web3iot.dhammada.com** is now configured with HTTPS!

## 🌐 Access Your Application

**Primary URL**: https://web3iot.dhammada.com

**Alternative**: http://web3iot.dhammada.com (redirects to HTTPS)

**IP Access**: http://152.42.239.238 (still works)

## 🔒 SSL Certificate Details

- **Domain**: web3iot.dhammada.com
- **Certificate**: Let's Encrypt (free, auto-renewing)
- **Expires**: 2026-02-26 (auto-renewal configured)
- **Status**: ✅ Active

## 📋 What Was Configured

1. ✅ **Nginx updated** to accept domain name
2. ✅ **SSL certificate** installed via Let's Encrypt
3. ✅ **HTTPS redirect** configured (HTTP → HTTPS)
4. ✅ **Frontend rebuilt** with domain API URL
5. ✅ **Auto-renewal** set up for SSL certificate

## 🔧 SSL Certificate Management

### Check Certificate Status

```bash
sudo certbot certificates
```

### Renew Certificate Manually

```bash
sudo certbot renew
```

### Test Renewal (dry run)

```bash
sudo certbot renew --dry-run
```

Auto-renewal runs twice daily and will renew certificates automatically before expiration.

## 🌍 DNS Configuration (Cloudflare)

Your DNS should be configured in Cloudflare:

**A Record**:
- Name: `web3iot` (or `@` for root domain)
- Type: `A`
- Content: `152.42.239.238`
- Proxy: Enabled (recommended for Cloudflare)

**Or CNAME**:
- Name: `web3iot`
- Type: `CNAME`
- Content: `dhammada.com`
- Proxy: Enabled

## 🔐 Cloudflare SSL Settings

If using Cloudflare proxy:

1. Go to Cloudflare Dashboard → SSL/TLS
2. Set encryption mode to **"Full"** or **"Full (strict)"**
3. This ensures end-to-end encryption

## ✅ Verification

Test these URLs:

- **Homepage**: https://web3iot.dhammada.com
- **IoT Dashboard**: https://web3iot.dhammada.com/dashboard
- **Web3 Process**: https://web3iot.dhammada.com/web3
- **Control Panel**: https://web3iot.dhammada.com/control
- **API**: https://web3iot.dhammada.com/api/sensors
- **Health**: https://web3iot.dhammada.com/health

All should work with HTTPS!

## 🛠️ Troubleshooting

### Certificate Not Working

```bash
# Check certificate
sudo certbot certificates

# Check Nginx config
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### DNS Not Resolving

1. Check Cloudflare DNS settings
2. Verify A record points to `152.42.239.238`
3. Wait for DNS propagation (can take up to 24 hours, usually < 1 hour)

### Mixed Content Warnings

If you see mixed content warnings:
- Frontend API URL is now set to `https://web3iot.dhammada.com/api`
- All requests should use HTTPS

## 📝 Current Configuration

- **Domain**: web3iot.dhammada.com
- **IP**: 152.42.239.238
- **SSL**: Let's Encrypt (auto-renewing)
- **Frontend API URL**: https://web3iot.dhammada.com/api
- **Status**: ✅ Fully configured

Your site is now accessible via your custom domain with HTTPS! 🎉

