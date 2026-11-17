/**
 * TemuKampus All-in-One Dev Runner
 * Menjalankan Server Backend (port 4000) dan Expo Metro Bundler bersamaan dalam 1 terminal.
 * Mendeteksi IP Wi-Fi laptop secara otomatis dan menyinkronkan file .env.
 */
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (/wi-fi|wlan|wireless/i.test(name)) {
      const match = interfaces[name].find(item => item.family === 'IPv4' && !item.internal);
      if (match) return match.address;
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const item of interfaces[name]) {
      if (item.family === 'IPv4' && !item.internal) {
        if (!item.address.startsWith('192.168.56.') && !item.address.startsWith('169.254.')) {
          return item.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const apiUrl = `http://${localIp}:4000`;
console.log('='.repeat(60));
console.log('🚀 TemuKampus All-in-One Dev Runner');
console.log(`📡 IP Wi-Fi Terdeteksi: ${localIp}`);
console.log(`🌐 Server Backend API : ${apiUrl}`);
console.log('='.repeat(60));

// 1. Sinkronkan .env secara otomatis
const envPath = path.join(__dirname, '..', '.env');
const envContent = `# Konfigurasi IPv4 LAN untuk Expo Go di HP\nEXPO_PUBLIC_API_BASE_URL=${apiUrl}\n`;
try {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ File .env berhasil disinkronkan ke IP Wi-Fi laptop.');
} catch (e) {
  console.warn('⚠️ Gagal memperbarui .env:', e.message);
}

const isWin = process.platform === 'win32';

// 2. Jalankan Backend Server (port 4000)
console.log('📦 Memulai Server Backend...');
const server = spawn('node', ['server/server.js'], {
  stdio: 'inherit',
  shell: isWin,
});

// 3. Jalankan Expo Bundler
console.log('📱 Memulai Expo Bundler (bersihkan cache)...');
const expoCmd = isWin ? 'npx.cmd' : 'npx';
const expo = spawn(expoCmd, ['expo', 'start'], {
  stdio: 'inherit',
  shell: isWin,
});

function cleanup() {
  console.log('\n🛑 Menghentikan seluruh proses TemuKampus...');
  try { server.kill(); } catch {}
  try { expo.kill(); } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

