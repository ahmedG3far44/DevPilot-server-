#!/bin/bash
set -e


export AWS_PROFILE=default
export AWS_SHARED_CREDENTIALS_FILE="/home/dev-pilot/.aws/credentials"

echo "🔍 Checking AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ AWS credentials not found or invalid. Please run 'aws configure' for this user."
  exit 1
fi
echo "✅ AWS credentials verified."

# --- Configuration (fixed values) ---
USERNAME="dev-pilot"
APP_BASE_DIR="/home/$USERNAME/apps"
HOSTED_ZONE_ID="Z086273229J9F273KBHFK"
SERVER_IP="72.61.103.22"
DOMAIN_SUFFIX="folio.business"

# --- Parse key=value arguments ---
for ARG in "$@"; do
  KEY=$(echo "$ARG" | cut -f1 -d=)
  VALUE=$(echo "$ARG" | cut -f2- -d=)
  case "$KEY" in
    project_name) project_name="$VALUE" ;;
    clone_url) clone_url="$VALUE" ;;
    app_directory) app_directory="$VALUE" ;;
    package_manager) package_manager="$VALUE" ;;
    port) port="$VALUE" ;;
    run_script) run_script="$VALUE" ;;
    build_script) build_script="$VALUE" ;;
    env_vars) env_vars="$VALUE" ;;
    *)
      echo "⚠️  Unknown argument: $KEY"
      ;;
  esac
done

# --- Basic Validation ---
if [[ -z "$project_name" || -z "$clone_url" || -z "$app_directory" || -z "$package_manager" || -z "$port" || -z "$run_script" ]]; then
  echo "❌ Missing required arguments!"
  echo ""
  echo "Usage:"
  echo "./deploy.sh \\"
  echo "  project_name=folio-app \\"
  echo "  clone_url=https://github.com/user/repo.git \\"
  echo "  app_directory=./server \\"
  echo "  package_manager=npm \\"
  echo "  port=4000 \\"
  echo "  run_script='npm run start' \\"
  echo "  build_script='npm run build'"
  exit 1
fi

APP_PATH="$APP_BASE_DIR/$project_name"
DNS_NAME="${project_name}.${DOMAIN_SUFFIX}"
DNS_NAME_WWW="www.${project_name}.${DOMAIN_SUFFIX}"

echo "🚀 Starting deployment for project: $project_name"

# --- Clone Repository ---
echo "📦 Cloning repository..."
sudo rm -rf "$APP_PATH"
git clone "$clone_url" "$APP_PATH"
cd "$APP_PATH"

# --- Detect Project Type ---
if [ -f "package.json" ]; then
  if grep -q "\"next\"" package.json; then
    PROJECT_TYPE="Next.js"
  elif grep -q "\"react\"" package.json; then
    PROJECT_TYPE="React"
  elif grep -q "\"@nestjs/core\"" package.json; then
    PROJECT_TYPE="NestJS"
  elif grep -q "\"express\"" package.json; then
    PROJECT_TYPE="Express"
  else
    PROJECT_TYPE="Unknown Node.js"
  fi
else
  PROJECT_TYPE="Unknown"
fi
echo "🧩 Detected project type: $PROJECT_TYPE"

# --- Cleanup (keep only app directory) ---
echo "🧹 Cleaning up unused files..."
find "$APP_PATH" -mindepth 1 -maxdepth 1 ! -name "$(basename "$app_directory")" -exec sudo rm -rf {} +

# --- Navigate to App Directory ---
cd "$APP_PATH/$app_directory"

# --- Setup ENV variables ---
if [ -n "$env_vars" ]; then
  echo "🌱 Writing environment variables to .env..."
  echo "$env_vars" | tr ' ' '\n' > .env
fi

# --- Install Dependencies ---
echo "📦 Installing dependencies with $package_manager..."
$package_manager install

# --- Prisma Client Generation ---
if grep -q "@prisma/client" package.json; then
  echo "🧬 Prisma detected — generating client..."
  npx prisma generate
fi

# --- Build Step (Optional) ---
if [ -n "$build_script" ]; then
  echo "🏗️ Running build script: $build_script"
  eval "$build_script"

  # If build succeeds and build folder exists — serve static files
  if [ -d "./dist" ] || [ -d "./build" ]; then
    BUILD_DIR=$( [ -d "./dist" ] && echo "dist" || echo "build" )
    echo "📂 Moving built files to /var/www/$project_name"
    sudo mkdir -p "/var/www/$project_name"
    sudo mv "$BUILD_DIR"/* "/var/www/$project_name/"
    cd /var/www/$project_name
    echo "🧹 Cleaning old app folder..."
    sudo rm -rf "$APP_PATH"
  fi
else
  echo "⚙️ No build script provided — skipping build..."
fi

# --- AWS Route53 DNS Setup ---
echo "🌍 Creating DNS records for $DNS_NAME and $DNS_NAME_WWW"
DNS_JSON=$(mktemp)
cat > "$DNS_JSON" <<EOF
{
  "Comment": "Create records for $project_name",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DNS_NAME",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "$SERVER_IP" }]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DNS_NAME_WWW",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "$SERVER_IP" }]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch file://"$DNS_JSON" > /tmp/aws_dns_output.json
CHANGE_ID=$(jq -r '.ChangeInfo.Id' /tmp/aws_dns_output.json)
echo "⏳ Waiting for DNS propagation..."
aws route53 wait resource-record-sets-changed --id "$CHANGE_ID"
echo "✅ DNS synced successfully!"

# --- Configure Nginx ---
NGINX_CONF="/etc/nginx/sites-available/${project_name}.conf"
echo "⚙️ Creating Nginx config..."

if [[ "$PROJECT_TYPE" == "React" || "$PROJECT_TYPE" == "Next.js" ]]; then
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DNS_NAME $DNS_NAME_WWW;
    root /var/www/$project_name;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }
}
EOF
else
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DNS_NAME $DNS_NAME_WWW;

    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
fi

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# --- Apply SSL Certificate Automatically ---
echo "🔐 Applying SSL certificate via Certbot..."
if sudo certbot certonly --nginx \
  -d "$DNS_NAME" -d "$DNS_NAME_WWW" \
  --non-interactive --agree-tos \
  -m "ahmedjaafarbadri@gmail.com"; then

  echo "✅ SSL certificate created successfully!"

  # Reconfigure Nginx to use SSL
  sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DNS_NAME $DNS_NAME_WWW;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DNS_NAME $DNS_NAME_WWW;

    ssl_certificate /etc/letsencrypt/live/$DNS_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DNS_NAME/privkey.pem;

    location / {
        $(if [[ "$PROJECT_TYPE" == "React" || "$PROJECT_TYPE" == "Next.js" ]]; then
          echo "root /var/www/$project_name;"
          echo "index index.html;"
          echo "try_files \$uri /index.html;"
        else
          echo "proxy_pass http://localhost:$port;"
          echo "proxy_http_version 1.1;"
          echo "proxy_set_header Upgrade \$http_upgrade;"
          echo "proxy_set_header Connection 'upgrade';"
          echo "proxy_set_header Host \$host;"
          echo "proxy_cache_bypass \$http_upgrade;"
        fi)
    }
}
EOF

  sudo nginx -t && sudo systemctl reload nginx
  echo "🔁 Nginx reloaded with HTTPS enabled!"
else
  echo "⚠️ SSL certificate creation failed — continuing without HTTPS."
fi

# --- Run app with PM2 ---
if [[ "$PROJECT_TYPE" != "React" && "$PROJECT_TYPE" != "Next.js" ]]; then
  echo "🚦 Starting Node app with PM2..."
  cd "$APP_PATH/$app_directory"
  sudo pm2 delete "${project_name}-${port}" >/dev/null 2>&1 || true
  sudo pm2 start bash --name "${project_name}-${port}" -- -c "cd $APP_PATH/$app_directory && $run_script"
  sudo pm2 save
  sudo pm2 restart "${project_name}-${port}"
fi

echo "✅ Deployment complete!"
echo "🌐 App running at: https://$DNS_NAME"
