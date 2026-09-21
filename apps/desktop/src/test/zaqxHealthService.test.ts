import { describe, it, expect } from 'vitest';
import { zaqxHealthService } from '../services/zaqx/ZaqXHealthService';

describe('ZaqXHealthService: System Diagnostics & Health Reporting', () => {
  it('performs diagnostic checks and produces typed ZaqXHealthReport', async () => {
    const report = await zaqxHealthService.checkHealth();

    expect(['healthy', 'degraded', 'unhealthy']).toContain(report.status);
    expect(report.checkedAt).toBeDefined();

    expect(report.checks.artifactIntegrity).toBe(true);
    expect(report.checks.tokenizerCompatibility).toBe(true);
    expect(report.checks.ggufValidity).toBe(true);

    expect(report.details.tokenizerHash).toMatch(/^tok-zaqx-/);
    expect(Array.isArray(report.details.errors)).toBe(true);
    expect(Array.isArray(report.details.warnings)).toBe(true);
  });
});
