#!/usr/bin/env bash
# One-shot hardening + install for a fresh Hetzner Ubuntu 24.04 VM (CX22 or larger).
# Run as root once:  bash <(curl -fsSL https://raw.githubusercontent.com/<you>/macrobrief/main/deploy/hetzner-bootstrap.sh)
# Then: su - deploy; git clone <repo>; cd macrobrief/deploy; cp .env.example .env; nano .env; docker compose up -d --build
set -euo pipefail

DEPLOY_USER=${DEPLOY_USER:-deploy}
SSH_PORT=${SSH_PORT:-22}
PUBKEY=${PUBKEY:-"$(cat /root/.ssh/authorized_keys 2>/dev/null || true)"}

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades apt-listchanges git

echo "== docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "== non-root deploy user"
id -u "$DEPLOY_USER" &>/dev/null || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
mkdir -p /home/$DEPLOY_USER/.ssh && chmod 700 /home/$DEPLOY_USER/.ssh
[ -n "$PUBKEY" ] && echo "$PUBKEY" > /home/$DEPLOY_USER/.ssh/authorized_keys && chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh

echo "== sshd: keys only, no root"
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
MaxAuthTries 3
LoginGraceTime 20
AllowUsers $DEPLOY_USER
EOF
systemctl restart ssh || systemctl restart sshd

echo "== firewall (only ssh, http, https)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT"/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "== fail2ban (sshd + caddy login abuse)"
cat > /etc/fail2ban/jail.d/macrobrief.local <<'EOF'
[sshd]
enabled = true
maxretry = 4
bantime = 1h
findtime = 10m

[caddy-login]
enabled = true
filter = caddy-login
logpath = /var/lib/docker/volumes/deploy_caddy_data/_data/access.log
maxretry = 10
findtime = 10m
bantime = 6h
port = http,https
EOF
cat > /etc/fail2ban/filter.d/caddy-login.conf <<'EOF'
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"uri":"/api/auth/login".*"status":(401|429).*$
ignoreregex =
EOF
systemctl enable --now fail2ban

echo "== automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== kernel/network sanity"
cat > /etc/sysctl.d/99-hardening.conf <<'EOF'
net.ipv4.conf.all.rp_filter=1
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.accept_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
EOF
sysctl --system >/dev/null

echo "== docker daemon: log rotation, no iptables surprises"
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" }, "live-restore": true }
EOF
systemctl restart docker

echo
echo "Done. Next:"
echo "  1. Point DNS A/AAAA for your DOMAIN at this server."
echo "  2. ssh -p $SSH_PORT $DEPLOY_USER@<ip>; git clone <repo>; cd macrobrief/deploy"
echo "  3. cp .env.example .env; fill in secrets (see comments); docker compose up -d --build"
echo "  4. Optional extra layer: put the site behind Cloudflare Access or restrict to Tailscale IPs in the Caddyfile."
echo "  5. Off-box backups: install restic and schedule 'restic backup /var/lib/docker/volumes/deploy_pg_data ./backup' to a Hetzner Storage Box."
