/**
 * Hekayaty Platform — Real Load Test
 * Uses autocannon to hit the live dev server on localhost:5000
 * Runs 4 progressive stages: Baseline → Peak → Stress → Spike
 */

const autocannon = require('autocannon');

const BASE_URL = 'http://localhost:5000';

// Test endpoints — realistic user journey (public, no auth required)
const ENDPOINTS = [
  '/api/products',
  '/api/users/writers',
  '/api/products?type=ebook',
  '/api/products?genre=romance',
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function printResult(stageName, result) {
  const p50 = result.latency.p50;
  const p95 = result.latency.p95;
  const p99 = result.latency.p99;
  const rps = Math.round(result.requests.average);
  const errors = result.errors + result.timeouts;
  const total = result.requests.total;
  const errorRate = total > 0 ? ((errors / total) * 100).toFixed(2) : '0.00';
  const throughput = formatBytes(result.throughput.average) + '/s';

  const p95Status = p95 < 300 ? '✅' : p95 < 1000 ? '⚠️' : '❌';
  const errStatus = parseFloat(errorRate) < 1 ? '✅' : parseFloat(errorRate) < 5 ? '⚠️' : '❌';

  console.log('\n' + '═'.repeat(60));
  console.log(`  📊 ${stageName}`);
  console.log('═'.repeat(60));
  console.log(`  RPS (avg):          ${rps.toLocaleString()}`);
  console.log(`  Total Requests:     ${total.toLocaleString()}`);
  console.log(`  Throughput:         ${throughput}`);
  console.log(`  Latency P50:        ${p50}ms`);
  console.log(`  Latency P95:        ${p95}ms  ${p95Status}`);
  console.log(`  Latency P99:        ${p99}ms`);
  console.log(`  Errors/Timeouts:    ${errors} (${errorRate}%)  ${errStatus}`);

  let verdict = '';
  if (parseFloat(errorRate) > 5 || p95 > 1000) {
    verdict = '🔴 SYSTEM OVERLOADED — Breaking Point Reached';
  } else if (parseFloat(errorRate) > 1 || p95 > 300) {
    verdict = '🟡 DEGRADING — Approaching Limits';
  } else {
    verdict = '🟢 STABLE — Healthy Performance';
  }
  console.log(`  Verdict:            ${verdict}`);
  console.log('═'.repeat(60));

  return { rps, p95, errorRate: parseFloat(errorRate), errors };
}

async function runStage(name, connections, duration, pipelining = 1) {
  console.log(`\n⏳ Starting: ${name}`);
  console.log(`   Connections: ${connections} | Duration: ${duration}s | Pipelining: ${pipelining}`);

  // Rotate through endpoints for realistic traffic mix
  const url = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];

  return new Promise((resolve) => {
    const instance = autocannon({
      url: BASE_URL + url,
      connections,
      duration,
      pipelining,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HekayatyLoadTest/1.0',
      },
      timeout: 10,
    }, (err, result) => {
      if (err) {
        console.error('Load test error:', err.message);
        resolve(null);
        return;
      }
      const summary = printResult(name, result);
      resolve(summary);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function runAllTests() {
  console.log('\n🚀 HEKAYATY PLATFORM — REAL LOAD TEST');
  console.log('   Target: http://localhost:5000');
  console.log('   Started:', new Date().toLocaleString());

  const results = [];

  // Stage 1: Baseline (simulates ~200 normal users)
  const s1 = await runStage('Stage 1 — Baseline (200 Users)', 50, 20, 1);
  results.push({ stage: 'Baseline', ...s1 });
  await new Promise(r => setTimeout(r, 3000)); // Cool-down

  // Stage 2: Peak Traffic (simulates ~1,000 users)
  const s2 = await runStage('Stage 2 — Peak Traffic (1,000 Users)', 200, 20, 1);
  results.push({ stage: 'Peak', ...s2 });
  await new Promise(r => setTimeout(r, 3000));

  // Stage 3: Stress (simulates ~3,000 users)
  const s3 = await runStage('Stage 3 — Stress Test (3,000 Users)', 500, 20, 1);
  results.push({ stage: 'Stress', ...s3 });
  await new Promise(r => setTimeout(r, 3000));

  // Stage 4: Breaking Point (simulates ~6,000+ users)
  const s4 = await runStage('Stage 4 — Breaking Point (6,000+ Users)', 1000, 15, 1);
  results.push({ stage: 'Breaking', ...s4 });

  // Final Report
  console.log('\n\n' + '█'.repeat(60));
  console.log('  📈 FINAL LOAD TEST REPORT');
  console.log('█'.repeat(60));

  let maxStableRps = 0;
  let maxStableUsers = 0;
  let breakingPoint = null;

  for (const r of results) {
    if (r && r.errorRate < 1 && r.p95 < 300) {
      maxStableRps = Math.max(maxStableRps, r.rps || 0);
      const userMap = { 'Baseline': 200, 'Peak': 1000, 'Stress': 3000, 'Breaking': 6000 };
      maxStableUsers = Math.max(maxStableUsers, userMap[r.stage] || 0);
    } else if (!breakingPoint && r && (r.errorRate >= 1 || r.p95 >= 300)) {
      breakingPoint = r.stage;
    }
  }

  console.log(`\n  ✅ Max Stable Concurrent Users:  ~${maxStableUsers.toLocaleString()}`);
  console.log(`  ✅ Max Stable RPS:               ~${maxStableRps.toLocaleString()}`);
  console.log(`  🔴 Breaking Point Stage:         ${breakingPoint || 'Not reached in this test'}`);
  console.log('\n  💡 Scaling Recommendations:');
  if (maxStableUsers >= 3000) {
    console.log('     → System is performing EXCELLENTLY. Add Redis to push past 10K CCU.');
  } else if (maxStableUsers >= 1000) {
    console.log('     → System is MID-SCALE stable. Add Redis + horizontal scaling for enterprise load.');
  } else {
    console.log('     → System needs optimization. Review DB queries and add caching.');
  }
  console.log('\n' + '█'.repeat(60));
  console.log('  Load Test Complete:', new Date().toLocaleString());
  console.log('█'.repeat(60) + '\n');
}

runAllTests().catch(console.error);
