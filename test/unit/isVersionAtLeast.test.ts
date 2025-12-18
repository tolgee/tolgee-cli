import { isVersionAtLeast } from '#cli/utils/isVersionAtLeast.js';

describe('isVersionAtLeast', () => {
  describe('basic version comparisons', () => {
    it('returns true when current version equals required version', () => {
      expect(isVersionAtLeast('1.0.0', '1.0.0')).toBe(true);
      expect(isVersionAtLeast('2.5.3', '2.5.3')).toBe(true);
      expect(isVersionAtLeast('10.20.30', '10.20.30')).toBe(true);
    });

    it('returns true when current version is greater than required version', () => {
      expect(isVersionAtLeast('1.0.0', '1.0.1')).toBe(true);
      expect(isVersionAtLeast('1.0.0', '1.1.0')).toBe(true);
      expect(isVersionAtLeast('1.0.0', '2.0.0')).toBe(true);
      expect(isVersionAtLeast('2.5.3', '2.5.4')).toBe(true);
      expect(isVersionAtLeast('2.5.3', '2.6.0')).toBe(true);
      expect(isVersionAtLeast('2.5.3', '3.0.0')).toBe(true);
    });

    it('returns false when current version is less than required version', () => {
      expect(isVersionAtLeast('1.0.1', '1.0.0')).toBe(false);
      expect(isVersionAtLeast('1.1.0', '1.0.0')).toBe(false);
      expect(isVersionAtLeast('2.0.0', '1.0.0')).toBe(false);
      expect(isVersionAtLeast('2.5.4', '2.5.3')).toBe(false);
      expect(isVersionAtLeast('2.6.0', '2.5.3')).toBe(false);
      expect(isVersionAtLeast('3.0.0', '2.5.3')).toBe(false);
    });
  });

  describe('edge case: local build version', () => {
    it('returns true when current version is "??" (local build)', () => {
      expect(isVersionAtLeast('1.0.0', '??')).toBe(true);
      expect(isVersionAtLeast('5.10.15', '??')).toBe(true);
      expect(isVersionAtLeast('0.0.1', '??')).toBe(true);
    });
  });

  describe('version prefix handling', () => {
    it('handles "v" prefix in required version', () => {
      expect(isVersionAtLeast('v1.0.0', '1.0.0')).toBe(true);
      expect(isVersionAtLeast('v1.0.0', '1.0.1')).toBe(true);
      expect(isVersionAtLeast('v1.0.1', '1.0.0')).toBe(false);
    });

    it('handles "v" prefix in current version', () => {
      expect(isVersionAtLeast('1.0.0', 'v1.0.0')).toBe(true);
      expect(isVersionAtLeast('1.0.0', 'v1.0.1')).toBe(true);
      expect(isVersionAtLeast('1.0.1', 'v1.0.0')).toBe(false);
    });

    it('handles "v" prefix in both versions', () => {
      expect(isVersionAtLeast('v1.0.0', 'v1.0.0')).toBe(true);
      expect(isVersionAtLeast('v1.0.0', 'v1.0.1')).toBe(true);
      expect(isVersionAtLeast('v1.0.1', 'v1.0.0')).toBe(false);
    });

    it('handles mixed prefix scenarios', () => {
      expect(isVersionAtLeast('v2.5.3', '2.6.0')).toBe(true);
      expect(isVersionAtLeast('2.5.3', 'v2.4.0')).toBe(false);
    });
  });

  describe('different version part lengths', () => {
    it('handles versions with different number of parts', () => {
      expect(isVersionAtLeast('1.0', '1.0.0')).toBe(true);
      expect(isVersionAtLeast('1.0.0', '1.0')).toBe(true);
      expect(isVersionAtLeast('1.0', '1.0.1')).toBe(true);
      expect(isVersionAtLeast('1.0.1', '1.0')).toBe(false);
    });

    it('treats missing parts as zero', () => {
      expect(isVersionAtLeast('1.2', '1.2.0')).toBe(true);
      expect(isVersionAtLeast('1.2.0', '1.2')).toBe(true);
      expect(isVersionAtLeast('1.2', '1.2.1')).toBe(true);
      expect(isVersionAtLeast('1.2.1', '1.2')).toBe(false);
    });

    it('handles single part versions', () => {
      expect(isVersionAtLeast('1', '1.0.0')).toBe(true);
      expect(isVersionAtLeast('1.0.0', '1')).toBe(true);
      expect(isVersionAtLeast('1', '2')).toBe(true);
      expect(isVersionAtLeast('2', '1')).toBe(false);
    });

    it('handles complex mixed length scenarios', () => {
      expect(isVersionAtLeast('1.2.3.4', '1.2.3')).toBe(false);
      expect(isVersionAtLeast('1.2.3', '1.2.3.4')).toBe(true);
      expect(isVersionAtLeast('1.2.3.0', '1.2.3')).toBe(true);
      expect(isVersionAtLeast('1.2.3', '1.2.3.0')).toBe(true);
    });
  });

  describe('realistic version scenarios', () => {
    it('handles typical semantic versions', () => {
      expect(isVersionAtLeast('3.142.0', '3.143.0')).toBe(true);
      expect(isVersionAtLeast('3.143.0', '3.142.0')).toBe(false);
      expect(isVersionAtLeast('v3.142.0', 'v3.143.0')).toBe(true);
    });

    it('handles pre-release version formats', () => {
      // Note: This function only handles numeric parts, so this tests the numeric parsing
      expect(isVersionAtLeast('1.0.0', '1.0.1')).toBe(true);
      expect(isVersionAtLeast('2.1.0', '2.0.9')).toBe(false);
    });

    it('handles zero versions', () => {
      expect(isVersionAtLeast('0.0.0', '0.0.0')).toBe(true);
      expect(isVersionAtLeast('0.0.0', '0.0.1')).toBe(true);
      expect(isVersionAtLeast('0.0.1', '0.0.0')).toBe(false);
    });

    it('handles large version numbers', () => {
      expect(isVersionAtLeast('100.200.300', '100.200.301')).toBe(true);
      expect(isVersionAtLeast('100.200.301', '100.200.300')).toBe(false);
    });
  });
});
