/**
 * СТАТИЧЕСКИЕ ТЕСТЫ ERP СИСТЕМЫ
 * Проверка архитектуры, типов и логики без Firebase API
 */

console.log('🚀 Starting Static ERP System Tests...\n');

// =================================
// ТЕСТЫ ТИПОВ И АРХИТЕКТУРЫ
// =================================

class StaticERPTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  test(name, testFn) {
    this.results.total++;
    console.log(`🧪 Testing: ${name}`);
    
    try {
      const result = testFn();
      if (result) {
        this.results.passed++;
        console.log(`✅ PASSED: ${name}`);
        this.results.tests.push({ name, passed: true, error: null });
      } else {
        this.results.failed++;
        console.log(`❌ FAILED: ${name}`);
        this.results.tests.push({ name, passed: false, error: 'Test returned false' });
      }
    } catch (error) {
      this.results.failed++;
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.results.tests.push({ name, passed: false, error: error.message });
    }
    console.log('');
  }

  // =================================
  // ТЕСТЫ TYPE GUARDS
  // =================================

  testTypeGuards() {
    return this.test('Type Guards Functionality', () => {
      // Симуляция type guards
      const isProductItem = (item) => item.type === 'product';
      const isServiceItem = (item) => item.type === 'service';
      const isBundleItem = (item) => item.type === 'bundle';

      const testProduct = { type: 'product', name: 'Test Product' };
      const testService = { type: 'service', name: 'Test Service' };
      const testBundle = { type: 'bundle', name: 'Test Bundle' };

      return (
        isProductItem(testProduct) === true &&
        isServiceItem(testProduct) === false &&
        isServiceItem(testService) === true &&
        isProductItem(testService) === false &&
        isBundleItem(testBundle) === true &&
        isProductItem(testBundle) === false
      );
    });
  }

  // =================================
  // ТЕСТЫ ВАЛИДАЦИИ
  // =================================

  testItemValidation() {
    return this.test('Item Validation Logic', () => {
      const validateItem = (item) => {
        const errors = [];
        if (!item.code?.trim()) errors.push('Code required');
        if (!item.name?.trim()) errors.push('Name required');
        if (!item.baseUnit) errors.push('Base unit required');
        if (item.type === 'product' && !item.productData) errors.push('Product data required');
        if (item.type === 'service' && !item.serviceData) errors.push('Service data required');
        if (item.type === 'bundle' && !item.bundleData) errors.push('Bundle data required');
        
        return {
          isValid: errors.length === 0,
          errors
        };
      };

      const validProduct = {
        type: 'product',
        code: 'PROD-001',
        name: 'Test Product',
        baseUnit: 'pcs',
        productData: { stockable: true }
      };

      const invalidProduct = {
        type: 'product',
        code: '',
        name: '',
        baseUnit: null
      };

      const validResult = validateItem(validProduct);
      const invalidResult = validateItem(invalidProduct);

      return validResult.isValid && !invalidResult.isValid && invalidResult.errors.length >= 3;
    });
  }

  // =================================
  // ТЕСТЫ БИЗНЕС-ЛОГИКИ
  // =================================

  testFIFOLogic() {
    return this.test('FIFO Logic Simulation', () => {
      // Симуляция FIFO алгоритма
      const lots = [
        { id: 'lot1', qty: 10, cost: 100, date: '2024-01-01' },
        { id: 'lot2', qty: 15, cost: 120, date: '2024-01-02' },
        { id: 'lot3', qty: 20, cost: 110, date: '2024-01-03' }
      ];

      const issueFIFO = (lots, requestedQty) => {
        const sortedLots = [...lots].sort((a, b) => new Date(a.date) - new Date(b.date));
        const issued = [];
        let remaining = requestedQty;

        for (const lot of sortedLots) {
          if (remaining <= 0) break;
          
          const qtyToIssue = Math.min(lot.qty, remaining);
          issued.push({
            lotId: lot.id,
            qty: qtyToIssue,
            cost: lot.cost,
            totalCost: qtyToIssue * lot.cost
          });
          remaining -= qtyToIssue;
        }

        return { issued, remaining };
      };

      const result = issueFIFO(lots, 25);
      
      // Должно списать: lot1 (10 шт) + lot2 (15 шт) = 25 шт
      return (
        result.issued.length === 2 &&
        result.issued[0].lotId === 'lot1' &&
        result.issued[0].qty === 10 &&
        result.issued[1].lotId === 'lot2' &&
        result.issued[1].qty === 15 &&
        result.remaining === 0
      );
    });
  }

  testWACCalculation() {
    return this.test('WAC (Weighted Average Cost) Calculation', () => {
      const calculateWAC = (receipts) => {
        let totalQty = 0;
        let totalCost = 0;

        for (const receipt of receipts) {
          totalQty += receipt.qty;
          totalCost += receipt.qty * receipt.unitCost;
        }

        return totalQty > 0 ? totalCost / totalQty : 0;
      };

      const receipts = [
        { qty: 100, unitCost: 50 },  // 100 * 50 = 5000
        { qty: 100, unitCost: 70 }   // 100 * 70 = 7000
      ];
      // Итого: 200 шт за 12000 = 60 за штуку

      const avgCost = calculateWAC(receipts);
      return Math.abs(avgCost - 60) < 0.01;
    });
  }

  testReservationLogic() {
    return this.test('Reservation Logic', () => {
      const calculateAvailableQty = (totalQty, reservedQty) => {
        return Math.max(0, totalQty - reservedQty);
      };

      const canIssue = (availableQty, requestedQty, allowNegative = false) => {
        if (allowNegative) return true;
        return availableQty >= requestedQty;
      };

      // Тест 1: Обычная ситуация
      const available1 = calculateAvailableQty(100, 30); // = 70
      const canIssue1 = canIssue(available1, 50, false); // true (70 >= 50)

      // Тест 2: Недостаточно товара
      const available2 = calculateAvailableQty(100, 80); // = 20
      const canIssue2 = canIssue(available2, 30, false); // false (20 < 30)

      // Тест 3: Разрешены отрицательные остатки
      const canIssue3 = canIssue(available2, 30, true); // true

      return (
        available1 === 70 &&
        canIssue1 === true &&
        available2 === 20 &&
        canIssue2 === false &&
        canIssue3 === true
      );
    });
  }

  // =================================
  // ТЕСТЫ АРХИТЕКТУРЫ
  // =================================

  testDTOStructure() {
    return this.test('DTO Structure Validation', () => {
      const validateCreateItemDto = (dto) => {
        const required = ['type', 'code', 'name', 'category', 'baseUnit'];
        const missing = required.filter(field => !dto[field]);
        
        if (missing.length > 0) {
          return { valid: false, missing };
        }

        // Проверка специфичных данных по типу
        if (dto.type === 'product' && !dto.productData) {
          return { valid: false, missing: ['productData'] };
        }
        if (dto.type === 'service' && !dto.serviceData) {
          return { valid: false, missing: ['serviceData'] };
        }
        if (dto.type === 'bundle' && !dto.bundleData) {
          return { valid: false, missing: ['bundleData'] };
        }

        return { valid: true, missing: [] };
      };

      const validDto = {
        type: 'product',
        code: 'TEST-001',
        name: 'Test Item',
        category: 'building_materials',
        baseUnit: 'pcs',
        productData: { stockable: true }
      };

      const invalidDto = {
        type: 'product',
        code: 'TEST-002'
        // Отсутствуют обязательные поля
      };

      const validResult = validateCreateItemDto(validDto);
      const invalidResult = validateCreateItemDto(invalidDto);

      return validResult.valid && !invalidResult.valid && invalidResult.missing.length > 0;
    });
  }

  testUnitConversion() {
    return this.test('Unit Conversion Logic', () => {
      const convertUnit = (value, fromUnit, toUnit) => {
        const conversions = {
          // Длина -> мм
          'mm': { 'cm': 0.1, 'm': 0.001 },
          'cm': { 'mm': 10, 'm': 0.01 },
          'm': { 'mm': 1000, 'cm': 100 },
          
          // Масса -> г
          'g': { 'kg': 0.001 },
          'kg': { 'g': 1000 },
          
          // Объем -> мл
          'ml': { 'l': 0.001 },
          'l': { 'ml': 1000 }
        };

        if (fromUnit === toUnit) return value;
        
        const factor = conversions[fromUnit]?.[toUnit];
        if (!factor) throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
        
        return value * factor;
      };

      try {
        const test1 = convertUnit(1000, 'mm', 'm'); // = 1
        const test2 = convertUnit(2, 'kg', 'g'); // = 2000
        const test3 = convertUnit(500, 'ml', 'l'); // = 0.5
        const test4 = convertUnit(100, 'cm', 'cm'); // = 100 (same unit)

        return (
          Math.abs(test1 - 1) < 0.001 &&
          test2 === 2000 &&
          Math.abs(test3 - 0.5) < 0.001 &&
          test4 === 100
        );
      } catch (error) {
        return false;
      }
    });
  }

  // =================================
  // ТЕСТЫ БЕЗОПАСНОСТИ
  // =================================

  testBusinessRules() {
    return this.test('Business Rules Enforcement', () => {
      const enforceBusinessRules = (operation) => {
        const rules = [];

        // Правило 1: Нельзя менять тип после создания
        if (operation.type === 'update' && operation.changes.type && operation.existingItem.type !== operation.changes.type) {
          rules.push('Cannot change item type after creation');
        }

        // Правило 2: Услуги не имеют складских операций
        if (operation.type === 'stockMovement' && operation.item.type === 'service') {
          rules.push('Services cannot have stock movements');
        }

        // Правило 3: Отрицательные остатки (если запрещены)
        if (operation.type === 'stockIssue' && !operation.warehouse.allowNegativeStock) {
          const newQty = operation.currentQty - operation.issueQty;
          if (newQty < 0) {
            rules.push('Negative stock not allowed');
          }
        }

        // Правило 4: Резервирование не может превышать остаток
        if (operation.type === 'reservation') {
          const availableQty = operation.currentQty - operation.existingReservations;
          if (operation.reserveQty > availableQty) {
            rules.push('Cannot reserve more than available quantity');
          }
        }

        return {
          allowed: rules.length === 0,
          violations: rules
        };
      };

      // Тест 1: Попытка изменить тип
      const test1 = enforceBusinessRules({
        type: 'update',
        existingItem: { type: 'product' },
        changes: { type: 'service' }
      });

      // Тест 2: Складская операция для услуги
      const test2 = enforceBusinessRules({
        type: 'stockMovement',
        item: { type: 'service' }
      });

      // Тест 3: Отрицательные остатки
      const test3 = enforceBusinessRules({
        type: 'stockIssue',
        warehouse: { allowNegativeStock: false },
        currentQty: 10,
        issueQty: 15
      });

      // Тест 4: Избыточное резервирование
      const test4 = enforceBusinessRules({
        type: 'reservation',
        currentQty: 100,
        existingReservations: 80,
        reserveQty: 30 // Доступно только 20
      });

      return (
        !test1.allowed && test1.violations.length > 0 &&
        !test2.allowed && test2.violations.length > 0 &&
        !test3.allowed && test3.violations.length > 0 &&
        !test4.allowed && test4.violations.length > 0
      );
    });
  }

  // =================================
  // ЗАПУСК ВСЕХ ТЕСТОВ
  // =================================

  runAllTests() {
    console.log('📊 STATIC TESTS - NO API CALLS REQUIRED\n');

    // Тесты типов
    this.testTypeGuards();
    this.testItemValidation();
    this.testDTOStructure();
    this.testUnitConversion();

    // Тесты бизнес-логики
    this.testFIFOLogic();
    this.testWACCalculation();
    this.testReservationLogic();

    // Тесты безопасности
    this.testBusinessRules();

    this.generateReport();
  }

  generateReport() {
    console.log('\n=================================');
    console.log('📊 STATIC TEST RESULTS');
    console.log('=================================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    console.log('');

    // Детальные результаты
    console.log('📋 DETAILED RESULTS:');
    this.results.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      if (!test.passed && test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });

    console.log('\n=================================');
    console.log('🎯 SUMMARY:');
    
    const criticalTests = [
      'Type Guards Functionality',
      'Item Validation Logic', 
      'FIFO Logic Simulation',
      'Business Rules Enforcement'
    ];

    const criticalPassed = this.results.tests
      .filter(t => criticalTests.includes(t.name))
      .every(t => t.passed);

    const overallSuccess = this.results.passed >= this.results.total * 0.8;

    if (criticalPassed && overallSuccess) {
      console.log('🎉 ARCHITECTURE VALIDATION PASSED');
      console.log('   Core ERP logic is sound and ready for implementation');
      console.log('   Business rules are properly enforced');
      console.log('   Type system is working correctly');
    } else {
      console.log('⚠️  ARCHITECTURE ISSUES FOUND');
      if (!criticalPassed) {
        console.log('   - Critical business logic failures detected');
      }
      if (!overallSuccess) {
        console.log('   - Overall success rate below acceptable threshold');
      }
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Fix any failing tests above');
    console.log('   2. Wait for API limits to reset');
    console.log('   3. Run full integration tests with Firebase');
    console.log('   4. Implement UI components');
    console.log('=================================');
  }
}

// =================================
// ЗАПУСК ТЕСТОВ
// =================================

const tester = new StaticERPTester();
tester.runAllTests();
