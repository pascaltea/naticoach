#!/usr/bin/env bash
# Recopie l'app web (../app) dans le webDir Capacitor, puis pousse vers iOS/Android.
set -e
cd "$(dirname "$0")"
rm -rf www
cp -R ../app www
if [ -d ios ] || [ -d android ]; then
  npx cap copy
  echo "✓ Web synchronisé + cap copy (plateformes natives mises à jour)"
else
  echo "✓ Web synchronisé dans native/www (aucune plateforme native encore : lance d'abord npx cap add ios / android)"
fi
