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

// Функция для замены локали в файле
function replaceLocaleInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Замены для локализации (только для денежных форматов)
    const replacements = [
      // Число форматирование с toLocaleString - заменяем только если это про деньги/валюту
      { from: /toLocaleString\(\s*'ru-RU'\s*,\s*{\s*([^}]*currency[^}]*)\s*}\s*\)/gi, to: "toLocaleString('en-US', { $1 })" },
      { from: /toLocaleString\(\s*"ru-RU"\s*,\s*{\s*([^}]*currency[^}]*)\s*}\s*\)/gi, to: 'toLocaleString("en-US", { $1 })' },
      
      // Простые toLocaleString для чисел (без параметров) - тоже заменим на en-US для унификации
      { from: /(\d+|amount|total|cost|price|budget|value)\.toLocaleString\(\)/gi, to: "$1.toLocaleString('en-US')" },
      
      // Голосовые команды остаются на русском
      // recognition.lang = 'ru-RU'; - НЕ ЗАМЕНЯЕМ
      
      // Остальные ru локали заменяем на en только если это НЕ голосовой ввод
    ];
    
    // Специальная обработка для исключения голосового ввода
    if (!content.includes('recognition.lang') && !content.includes('Speech')) {
      replacements.push(
        // Даты можно оставить на русском для пользователей, или заменить на en-US
        // Пока заменим на en-US для унификации
        { from: /toLocaleDateString\(\s*'ru-RU'/g, to: "toLocaleDateString('en-US'" },
        { from: /toLocaleDateString\(\s*"ru-RU"/g, to: 'toLocaleDateString("en-US"' },
        { from: /toLocaleTimeString\(\s*'ru-RU'/g, to: "toLocaleTimeString('en-US'" },
        { from: /toLocaleTimeString\(\s*"ru-RU"/g, to: 'toLocaleTimeString("en-US"' },
        { from: /toLocaleString\(\s*'ru-RU'/g, to: "toLocaleString('en-US'" },
        { from: /toLocaleString\(\s*"ru-RU"/g, to: 'toLocaleString("en-US"' },
        { from: /localeCompare\([^,]+,\s*'ru'/g, to: "localeCompare($1, 'en'" }
      );
    }
    
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
  
  console.log('🔄 Начинаем замену локализации с ru-RU на en-US...');
  
  const allFiles = getAllFiles(srcPath);
  let changedFiles = 0;
  
  allFiles.forEach(filePath => {
    if (replaceLocaleInFile(filePath)) {
      changedFiles++;
    }
  });
  
  console.log(`\n✨ Замена завершена!`);
  console.log(`📊 Обработано файлов: ${allFiles.length}`);
  console.log(`🔄 Изменено файлов: ${changedFiles}`);
  
  if (changedFiles > 0) {
    console.log('\n🚀 Локализация изменена с русской на американскую.');
    console.log('💡 Голосовой ввод остается на русском языке.');
  }
}

main();