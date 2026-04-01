const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Настройки
const GIT_REMOTE = process.env.GIT_REMOTE || 'origin'; // Можно задать через переменную окружения
const GIT_BRANCH = process.env.GIT_BRANCH || 'main';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL) || 43200000; // 12 часов по умолчанию

function executeGitCommand(command) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return output;
  } catch (error) {
    console.error(`Git command failed: ${command}`);
    console.error(error.message);
    return null;
  }
}

function syncCache() {
  console.log('[Git Sync] Starting cache sync...');
  
  // Проверяем есть ли изменения
  const status = executeGitCommand('git status --porcelain cache/ rd.json');
  
  if (!status || status.trim() === '') {
    console.log('[Git Sync] No changes to sync');
    return;
  }
  
  console.log('[Git Sync] Changes detected, syncing...');
  
  // Добавляем файлы
  executeGitCommand('git add cache/ rd.json');
  
  // Коммитим
  const timestamp = new Date().toISOString();
  executeGitCommand(`git commit -m "Auto sync cache - ${timestamp}"`);
  
  // Пушим
  const pushResult = executeGitCommand(`git push ${GIT_REMOTE} ${GIT_BRANCH}`);
  
  if (pushResult !== null) {
    console.log('[Git Sync] Successfully synced to remote');
  } else {
    console.log('[Git Sync] Failed to push to remote');
  }
}

// Запускаем синхронизацию по интервалу
console.log(`[Git Sync] Starting auto-sync every ${SYNC_INTERVAL / 3600000} hours`);
console.log(`[Git Sync] Remote: ${GIT_REMOTE}, Branch: ${GIT_BRANCH}`);

setInterval(syncCache, SYNC_INTERVAL);

// Первая синхронизация через 30 секунд после запуска
setTimeout(syncCache, 30000);

console.log('[Git Sync] Sync service started');
