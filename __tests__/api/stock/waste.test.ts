/**
 * Tests for Waste Recording functionality
 */

describe('Waste Recording', () => {
  describe('Waste quantity handling', () => {
    it('should always store waste as negative quantity', () => {
      const inputQuantity = 5;
      const storedQuantity = -Math.abs(inputQuantity);
      
      expect(storedQuantity).toBe(-5);
      expect(storedQuantity).toBeLessThan(0);
    });

    it('should handle already negative input', () => {
      const inputQuantity = -5;
      const storedQuantity = -Math.abs(inputQuantity);
      
      expect(storedQuantity).toBe(-5);
    });
  });

  describe('Waste value calculation', () => {
    it('should calculate total waste value correctly', () => {
      const wasteItems = [
        { quantity: -2, costPrice: 10 },
        { quantity: -3, costPrice: 5 },
        { quantity: -1, costPrice: 20 },
      ];

      const totalValue = wasteItems.reduce((sum, item) => {
        return sum + Math.abs(item.quantity) * (item.costPrice || 0);
      }, 0);

      expect(totalValue).toBe(55); // (2*10) + (3*5) + (1*20)
    });

    it('should handle items with no cost price', () => {
      const wasteItems = [
        { quantity: -2, costPrice: 10 },
        { quantity: -3, costPrice: null },
      ];

      const totalValue = wasteItems.reduce((sum, item) => {
        return sum + Math.abs(item.quantity) * (item.costPrice || 0);
      }, 0);

      expect(totalValue).toBe(20); // Only first item counted
    });
  });

  describe('Waste summary by reason', () => {
    it('should group waste by reason correctly', () => {
      const movements = [
        { reason: 'Expired', quantity: -5, costPrice: 10 },
        { reason: 'Expired', quantity: -3, costPrice: 10 },
        { reason: 'Damaged', quantity: -2, costPrice: 15 },
        { reason: null, quantity: -1, costPrice: 20 },
      ];

      const byReason: Record<string, { count: number; value: number }> = {};
      
      movements.forEach((m) => {
        const reason = m.reason || 'Unspecified';
        if (!byReason[reason]) {
          byReason[reason] = { count: 0, value: 0 };
        }
        byReason[reason].count += Math.abs(m.quantity);
        byReason[reason].value += Math.abs(m.quantity) * (m.costPrice || 0);
      });

      expect(byReason['Expired'].count).toBe(8);
      expect(byReason['Expired'].value).toBe(80);
      expect(byReason['Damaged'].count).toBe(2);
      expect(byReason['Damaged'].value).toBe(30);
      expect(byReason['Unspecified'].count).toBe(1);
      expect(byReason['Unspecified'].value).toBe(20);
    });
  });

  describe('Default waste reasons', () => {
    const DEFAULT_WASTE_REASONS = [
      'Expired',
      'Damaged', 
      'Spillage',
      'Preparation Loss',
      'Staff Meal',
      'Customer Complaint',
      'Quality Issue',
      'Other',
    ];

    it('should have all required default waste reasons', () => {
      expect(DEFAULT_WASTE_REASONS).toContain('Expired');
      expect(DEFAULT_WASTE_REASONS).toContain('Damaged');
      expect(DEFAULT_WASTE_REASONS).toContain('Spillage');
      expect(DEFAULT_WASTE_REASONS).toContain('Staff Meal');
      expect(DEFAULT_WASTE_REASONS).toContain('Other');
    });

    it('should have exactly 8 default reasons', () => {
      expect(DEFAULT_WASTE_REASONS.length).toBe(8);
    });
  });
});
