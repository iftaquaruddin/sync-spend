# 🐳 SyncSpend • Docker Deployment Guide

SyncSpend can be deployed on any platform supporting Docker, including **Linux VPS, Raspberry Pi / ARM64, Synology NAS, QNAP, Unraid, TrueNAS, CasaOS, and Cloud VPS providers**.

---

## ⚡ Quick Start

### 1. Clone & Launch with Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/iftaquaruddin/sync-spend.git
cd sync-spend

# 2. (Optional) Set your custom secret key
cp .env.example .env

# 3. Launch container in the background
docker compose up -d
```

### 2. Verify Container Health
```bash
docker compose ps
docker compose logs -f
```

The Web Dashboard and REST API will now be available at:
- **Local Machine**: `http://localhost:3000`
- **LAN / Wi-Fi**: `http://<your-host-ip>:3000`
- **Default Account**: `admin` / `admin123` *(change password upon first login)*

---

## 🏗️ Container Architecture & Data Persistence

The container encapsulates Node.js 22 LTS with embedded SQLite and WebAssembly Tesseract OCR:

```
┌────────────────────────────────────────────────────────┐
│                   Docker Host Machine                  │
│                                                        │
│   Volume: syncspend_data ────────┐                     │
│                                  │                     │
│   ┌──────────────────────────────▼─────────────────┐   │
│   │                 SyncSpend Container            │   │
│   │                                                │   │
│   │   /app/data/                                   │   │
│   │     ├── expenses.db       (SQLite Database)    │   │
│   │     └── uploads/receipts/ (Stored Bill Photos) │   │
│   │                                                │   │
│   │   Port: 3000 (HTTP API + PWA Web Dashboard)   │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> All user accounts, expense records, and uploaded receipt photos are stored inside the `/app/data` volume. Container restarts and image updates preserve 100% of your data.

---

## ⚙️ Environment Variables

Configure these in `.env` or in your Docker run command:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Host port where SyncSpend is exposed |
| `JWT_SECRET` | *(auto-default)* | Strong cryptographic key used to sign session tokens |
| `DATA_DIR` | `/app/data` | Path to persistent storage directory inside container |
| `SERVER_HOST` | *(auto-detected)* | Optional override for announced LAN IP or public domain |
| `NODE_ENV` | `production` | Set to `production` for optimized execution |

---

## 🚀 Platform-Specific Deployment Guides

### 1. Linux VPS / Server (Ubuntu, Debian, Fedora, Arch)
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
git clone https://github.com/iftaquaruddin/sync-spend.git
cd sync-spend
docker compose up -d
```

To run directly with `docker run` without compose:
```bash
docker volume create syncspend_data

docker run -d \
  --name syncspend \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-strong-random-key" \
  -v syncspend_data:/app/data \
  syncspend:latest
```

---

### 2. Raspberry Pi & ARM64 Single-Board Computers
The Dockerfile is multi-arch compatible. It compiles and runs natively on:
- Raspberry Pi 4 / 5 (Raspberry Pi OS 64-bit / Debian bookworm arm64)
- Apple Silicon (M1/M2/M3/M4)
- Orange Pi, Rock Pi, and ARM64 cloud instances (AWS Graviton, Oracle ARM)

```bash
docker compose up -d --build
```

---

### 3. Synology NAS (Container Manager / DSM 7.2+)
1. Open **Container Manager** on your Synology DSM.
2. Go to **Project** > Click **Create**.
3. Set **Project Name**: `syncspend`.
4. Set **Path**: Select a folder on your storage pool (e.g., `/docker/syncspend`).
5. Choose **Upload docker-compose.yml** and select the provided `docker-compose.yml`.
6. Click **Next** > **Done**. Synology will build and run the container automatically.

---

### 4. QNAP NAS (Container Station)
1. Open **Container Station** > Click **Applications** > **Create**.
2. Set application name to `syncspend`.
3. Paste the contents of `docker-compose.yml` into the editor.
4. Click **Create**.

---

### 5. Unraid
1. In the Unraid WebGUI, navigate to the **Docker** tab.
2. Click **Add Container**.
3. Configure the following fields:
   - **Name**: `syncspend`
   - **Repository**: `syncspend:latest` (or built from Dockerfile)
   - **Network Type**: `Bridge`
   - **Port 1**: Container Port `3000` -> Host Port `3000`
   - **Path 1**: Container Path `/app/data` -> Host Path `/mnt/user/appdata/syncspend`
4. Click **Apply**.

---

### 6. CasaOS / ZimaOS / Umbrel
1. Open **CasaOS** dashboard > Click **Custom Install** (the `+` icon).
2. Click **Import** in the upper right corner.
3. Paste the `docker-compose.yml` text and click **Submit**.
4. Set Web UI port to `3000` and click **Install**.

---

### 7. Portainer (Stack Deployment)
1. In Portainer, go to **Stacks** > **Add stack**.
2. Name the stack `syncspend`.
3. Select **Web editor** and paste the contents of `docker-compose.yml`.
4. Click **Deploy the stack**.

---

## 🔒 Production Reverse Proxy & SSL Setup

If exposing SyncSpend to your private domain (e.g. `https://expenses.yourdomain.com`), deploy behind a reverse proxy:

### Option A: Caddy (Automatic Free SSL)
```caddy
expenses.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Option B: Nginx
```nginx
server {
    listen 80;
    server_name expenses.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name expenses.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/expenses.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/expenses.yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 💾 Backup and Restore

### Create Backup Archive
Run this single command to create a timestamped compressed `.tar.gz` backup containing your SQLite database and all receipt bill pictures:

```bash
docker run --rm \
  -v syncspend_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/syncspend_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Backup
```bash
docker compose down

docker run --rm \
  -v syncspend_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/syncspend_backup_YYYYMMDD.tar.gz -C /data"

docker compose up -d
```

---

## 📱 Connecting Mobile Apps to the Docker Container

1. **Android APK**:
   - Open SyncSpend on your Android device.
   - At the bottom of the sign-in screen, tap **Server IP**.
   - Enter your Docker host IP: `http://192.168.1.xxx:3000` (or your domain `https://expenses.yourdomain.com`).
   - Sign in or register.

2. **iPhone (PWA)**:
   - Open Safari on your iPhone and navigate to `http://<docker-host-ip>:3000` or `https://expenses.yourdomain.com`.
   - Tap the **Share** button (box with upward arrow) > select **Add to Home Screen**.
   - SyncSpend runs as a standalone app with camera bill scanning enabled!
