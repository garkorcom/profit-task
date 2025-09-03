#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для рекурсивного обхода папок
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// Функция для замены валюты в файле
function replaceCurrencyInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Замены для валют
    const replacements = [
      // RUB -> USD
      { from: /'RUB'/g, to: "'USD'" },
      { from: /"RUB"/g, to: '"USD"' },
      { from: /\|\s*'RUB'/g, to: "| 'USD'" },
      { from: /\|\s*"RUB"/g, to: '| "USD"' },
      
      // ru-RU -> en-US для форматирования валют
      { from: /toLocaleString\(\s*'ru-RU'\s*,\s*{\s*style:\s*['"]currency['"],\s*currency:\s*['"]RUB['"]\s*}\s*\)/g, to: "toLocaleString('en-US', { style: 'currency', currency: 'USD' })" },
      { from: /toLocaleString\(\s*"ru-RU"\s*,\s*{\s*style:\s*['"]currency['"],\s*currency:\s*['"]RUB['"]\s*}\s*\)/g, to: 'toLocaleString("en-US", { style: "currency", currency: "USD" })' },
      
      // Общие замены ru-RU -> en-US для денежных форматов
      { from: /toLocaleString\(\s*'ru-RU'\s*,\s*{\s*([^}]*currency[^}]*)\s*}\s*\)/g, to: "toLocaleString('en-US', { $1 })" },
      { from: /toLocaleString\(\s*"ru-RU"\s*,\s*{\s*([^}]*currency[^}]*)\s*}\s*\)/g, to: 'toLocaleString("en-US", { $1 })' },
    ];
    
    replacements.forEach(replacement => {
      const newContent = content.replace(replacement.from, replacement.to);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    });
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Обновлен файл: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Ошибка при обработке файла ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция
function main() {
  const srcPath = path.join(__dirname, 'src');
  
  console.log('🔄 Начинаем замену валют с RUB на USD...');
  
  const allFiles = getAllFiles(srcPath);
  let changedFiles = 0;
  
  allFiles.forEach(filePath => {
    if (replaceCurrencyInFile(filePath)) {
      changedFiles++;
    }
  });
  
  console.log(`\n✨ Замена завершена!`);
  console.log(`📊 Обработано файлов: ${allFiles.length}`);
  console.log(`🔄 Изменено файлов: ${changedFiles}`);
  
  if (changedFiles > 0) {
    console.log('\n🚀 Рекомендуется проверить изменения и протестировать приложение.');
    console.log('💡 Используйте git diff для просмотра изменений.');
  }
}

main();