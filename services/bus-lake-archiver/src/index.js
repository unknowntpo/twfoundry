import { Kafka } from 'kafkajs';
import fs from 'fs';
import path from 'path';
import { MergeTable } from './merge.js';

const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'bus-lake-archiver',
  kafkaTopic: process.env.KAFKA_TOPIC || 'normalized.tdx.bus_vehicle_position',
  lakePath: process.env.LAKE_PATH || '../../data/lake',
  checkpointIntervalMs: parseInt(process.env.CHECKPOINT_INTERVAL_MS || '60000', 10),
  startFromBeginning: process.env.START_FROM_BEGINNING === 'true',
};

export class Archiver {
  constructor(opts = {}) {
    this.config = { ...config, ...opts };
    this.kafka = new Kafka({
      clientId: 'bus-lake-archiver',
      brokers: this.config.kafkaBrokers,
      logLevel: 1, // error
    });
    this.consumer = null;
    this.mergeTable = new MergeTable();
    this.running = false;
    this.lastCheckpointTime = Date.now();
    this.checkpointTimer = null;
    this.messageCount = 0;
  }

  async start() {
    console.log(`[Archiver] Starting with config:`, this.config);
    
    // Ensure lake path exists
    const lakePath = path.resolve(this.config.lakePath);
    if (!fs.existsSync(lakePath)) {
      fs.mkdirSync(lakePath, { recursive: true });
      console.log(`[Archiver] Created lake directory: ${lakePath}`);
    }
    
    // Create consumer
    this.consumer = this.kafka.consumer({ groupId: this.config.kafkaGroupId });
    
    await this.consumer.connect();
    console.log(`[Archiver] Connected to Kafka`);
    
    // Subscribe
    await this.consumer.subscribe({ 
      topic: this.config.kafkaTopic,
      fromBeginning: this.config.startFromBeginning,
    });
    
    this.running = true;
    
    // Start checkpoint timer
    this.checkpointTimer = setInterval(() => {
      this.checkpoint().catch(err => console.error('[Archiver] Checkpoint error:', err));
    }, this.config.checkpointIntervalMs);
    
    // Start message processing
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.processMessage(message);
      },
    });
  }

  async processMessage(message) {
    try {
      const value = JSON.parse(message.value.toString());
      
      // Validate required fields (minimal)
      if (!value.slot_key || !value.vehicle_id || !value.route_uid || value.direction === undefined) {
        console.warn('[Archiver] Invalid message (missing merge key fields):', value);
        return;
      }
      
      // Add archived_at timestamp
      value.archived_at = new Date().toISOString();
      
      // Upsert into merge table
      const inserted = this.mergeTable.upsert(value);
      this.messageCount++;
      
      if (this.messageCount % 100 === 0) {
        const stats = this.mergeTable.getStats();
        console.log(`[Archiver] Processed ${this.messageCount} messages. Merge table: inserts=${stats.inserts}, updates=${stats.updates}, dedups=${stats.dedups}, total_rows=${stats.totalRows}`);
      }
    } catch (err) {
      console.error('[Archiver] Error processing message:', err.message);
    }
  }

  async checkpoint() {
    if (!this.running || this.mergeTable.table.size === 0) {
      return;
    }
    
    const before = Date.now();
    
    try {
      // Group by service_date
      const rowsByDate = new Map();
      for (const row of this.mergeTable.getAllRows()) {
        if (!rowsByDate.has(row.service_date)) {
          rowsByDate.set(row.service_date, []);
        }
        rowsByDate.get(row.service_date).push(row);
      }
      
      // Write each date's rows to JSONL
      for (const [serviceDate, rows] of rowsByDate) {
        const filePath = path.resolve(this.config.lakePath, `${serviceDate}.jsonl`);
        const jsonlContent = rows.map(row => JSON.stringify(row)).join('\n');
        fs.writeFileSync(filePath, jsonlContent + '\n', 'utf-8');
      }
      
      const elapsed = Date.now() - before;
      const stats = this.mergeTable.getStats();
      console.log(`[Archiver] Checkpoint @ ${new Date().toISOString()}: wrote ${this.mergeTable.table.size} rows in ${elapsed}ms. Stats: inserts=${stats.inserts}, updates=${stats.updates}, dedups=${stats.dedups}`);
      
      this.lastCheckpointTime = before;
    } catch (err) {
      console.error('[Archiver] Checkpoint failed:', err);
    }
  }

  async stop() {
    console.log('[Archiver] Stopping...');
    this.running = false;
    
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
    
    // Final checkpoint
    await this.checkpoint();
    
    if (this.consumer) {
      await this.consumer.disconnect();
      console.log('[Archiver] Disconnected from Kafka');
    }
  }
}

// Run if this is main module
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const archiver = new Archiver();
  
  process.on('SIGINT', async () => {
    console.log('\n[Archiver] SIGINT received, stopping...');
    await archiver.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[Archiver] SIGTERM received, stopping...');
    await archiver.stop();
    process.exit(0);
  });
  
  archiver.start().catch(err => {
    console.error('[Archiver] Fatal error:', err);
    process.exit(1);
  });
}

export default Archiver;
