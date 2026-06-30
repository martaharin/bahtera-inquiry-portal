#!/usr/bin/env node

/**
 * Script to manually trigger the session expiry webhook
 * 
 * Usage:
 *   node scripts/trigger-session-expiry.js
 *   node scripts/trigger-session-expiry.js --local
 *   node scripts/trigger-session-expiry.js --check
 */

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const isCheckOnly = args.includes('--check');

const baseUrl = isLocal ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
const secretKey = process.env.WEBHOOK_SECRET || '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (secretKey && method === 'POST') {
      options.headers['x-webhook-secret'] = secretKey;
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log(`\n🔔 Session Expiry Webhook Trigger`);
  console.log(`================================`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Mode: ${isCheckOnly ? 'Check only' : 'Process sessions'}\n`);

  try {
    if (isCheckOnly) {
      console.log('📋 Checking pending expired sessions...\n');
      const result = await makeRequest('GET', '/api/session-expire-webhook');
      
      if (result.status === 200) {
        console.log(`Found ${result.data.count} pending sessions:\n`);
        result.data.expired_sessions.forEach((session) => {
          console.log(`  • Session: ${session.id}`);
          console.log(`    Created: ${new Date(session.created_at).toLocaleString()}`);
          console.log(`    Updated: ${new Date(session.updated_at).toLocaleString()}`);
          console.log(`    Status: ${session.extraction_status || 'pending'}\n`);
        });
      } else {
        console.error(`❌ Error: ${result.status}`);
        console.error(result.data);
      }
    } else {
      console.log('🚀 Processing expired sessions...\n');
      const result = await makeRequest('POST', '/api/session-expire-webhook', {
        secret_key: secretKey,
      });

      if (result.status === 200) {
        console.log(`✅ Webhook completed successfully!\n`);
        console.log(`   Processed: ${result.data.processed}`);
        console.log(`   Success: ${result.data.success_count}`);
        console.log(`   Errors: ${result.data.error_count}`);
        console.log(`   Skipped: ${result.data.skipped_count}\n`);

        if (result.data.results && result.data.results.length > 0) {
          console.log('📊 Results:\n');
          result.data.results.forEach((r) => {
            const icon = r.status === 'success' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
            console.log(`  ${icon} ${r.session_id}: ${r.status}`);
            if (r.inquiry_id) console.log(`     → Inquiry #${r.inquiry_id}, Ticket #${r.ticket_id}`);
            if (r.reason) console.log(`     → Reason: ${r.reason}`);
          });
        }
      } else if (result.status === 401) {
        console.error('❌ Unauthorized: Invalid or missing webhook secret');
        console.error('   Set WEBHOOK_SECRET environment variable or pass secret_key in body');
      } else {
        console.error(`❌ Error: ${result.status}`);
        console.error(result.data);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }

  console.log('\n================================\n');
}

main();
