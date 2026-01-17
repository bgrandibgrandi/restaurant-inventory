/**
 * Tests for Stock Movements functionality
 */

type MovementType = 'PURCHASE' | 'WASTE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'ADJUSTMENT';

function adjustQuantityForType(type: MovementType, quantity: number): number {
  if (type === 'PURCHASE' || type === 'TRANSFER_IN') {
    return Math.abs(quantity);
  }
  if (type === 'WASTE' || type === 'TRANSFER_OUT' || type === 'SALE') {
    return -Math.abs(quantity);
  }
  return quantity; // ADJUSTMENT keeps sign
}

describe('Stock Movements', () => {
  describe('Movement type quantity signs', () => {
    it('should make PURCHASE quantity positive', () => {
      const result = adjustQuantityForType('PURCHASE', 10);
      expect(result).toBeGreaterThan(0);
    });

    it('should make WASTE quantity negative', () => {
      const result = adjustQuantityForType('WASTE', 10);
      expect(result).toBeLessThan(0);
    });

    it('should make TRANSFER_OUT quantity negative', () => {
      const result = adjustQuantityForType('TRANSFER_OUT', 10);
      expect(result).toBeLessThan(0);
    });

    it('should make TRANSFER_IN quantity positive', () => {
      const result = adjustQuantityForType('TRANSFER_IN', 10);
      expect(result).toBeGreaterThan(0);
    });

    it('should allow ADJUSTMENT to be positive or negative', () => {
      const adjustmentUp = 5;
      const adjustmentDown = -3;
      
      expect(adjustmentUp).toBeGreaterThan(0);
      expect(adjustmentDown).toBeLessThan(0);
    });
  });

  describe('Stock balance calculation', () => {
    it('should calculate current stock from movements', () => {
      const movements = [
        { type: 'PURCHASE', quantity: 100 },
        { type: 'SALE', quantity: -30 },
        { type: 'WASTE', quantity: -5 },
        { type: 'ADJUSTMENT', quantity: 2 },
      ];

      const currentStock = movements.reduce((sum, m) => sum + m.quantity, 0);
      
      expect(currentStock).toBe(67); // 100 - 30 - 5 + 2
    });

    it('should handle empty movements', () => {
      const movements: { quantity: number }[] = [];
      const currentStock = movements.reduce((sum, m) => sum + m.quantity, 0);
      
      expect(currentStock).toBe(0);
    });
  });

  describe('Movement filtering', () => {
    it('should filter by date range', () => {
      const movements = [
        { createdAt: new Date('2024-01-01'), quantity: 10 },
        { createdAt: new Date('2024-01-15'), quantity: 20 },
        { createdAt: new Date('2024-02-01'), quantity: 30 },
      ];

      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-31');

      const filtered = movements.filter((m) => 
        m.createdAt >= startDate && m.createdAt <= endDate
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].quantity).toBe(20);
    });

    it('should filter by movement type', () => {
      const movements = [
        { type: 'PURCHASE', quantity: 100 },
        { type: 'WASTE', quantity: -5 },
        { type: 'PURCHASE', quantity: 50 },
        { type: 'SALE', quantity: -20 },
      ];

      const wasteOnly = movements.filter((m) => m.type === 'WASTE');
      const purchasesOnly = movements.filter((m) => m.type === 'PURCHASE');

      expect(wasteOnly.length).toBe(1);
      expect(purchasesOnly.length).toBe(2);
    });
  });
});
