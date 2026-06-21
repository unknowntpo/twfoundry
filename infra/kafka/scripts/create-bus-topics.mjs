#!/usr/bin/env node

/**
 * Create Kafka topics for bus pipeline Phase 1
 * 
 * This script is idempotent—it creates topics if they don't exist,
 * skips if they already exist.
 * 
 * Usage:
 *   node scripts/create-bus-topics.mjs [--replication-factor 1|3] [--kafka-broker localhost:9092]
 * 
 * Environment variables:
 *   KAFKA_BROKER (default: localhost:9092)
 *   REPLICATION_FACTOR (default: 1 for dev, set to 3 for prod-like)
 */

import { Kafka, logLevel } from 'kafkajs';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const replicationFactor = parseInt(process.env.REPLICATION_FACTOR || '1', 10);

// Parse CLI arguments
const args = process.argv.slice(2);
let argBroker = kafkaBroker;
let argRF = replicationFactor;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--kafka-broker' && args[i + 1]) {
    argBroker = args[i + 1];
    i++;
  }
  if (args[i] === '--replication-factor' && args[i + 1]) {
    argRF = parseInt(args[i + 1], 10);
    i++;
  }
}

const kafka = new Kafka({
  clientId: 'twfoundry-bus-admin',
  brokers: [argBroker],
  logLevel: logLevel.INFO,
});

const admin = kafka.admin();

async function createTopics() {
  try {
    await admin.connect();
    console.log(`Connected to Kafka at ${argBroker}`);

    // Determine min.insync.replicas based on replication factor
    const minIsr = Math.max(1, argRF - 1);

    const topicsConfig = [
      {
        topic: 'normalized.tdx.bus_vehicle_position',
        numPartitions: 6,
        replicationFactor: argRF,
        configEntries: [
          { name: 'min.insync.replicas', value: `${minIsr}` },
          { name: 'cleanup.policy', value: 'delete' },
          { name: 'retention.ms', value: '604800000' }, // 7 days
          // producer default (gzip from kafkajs); avoid lz4 — not supported by kafkajs consumer without extra codec
        ],
      },
      {
        topic: 'dlq.tdx.bus_vehicle_position',
        numPartitions: 3,
        replicationFactor: argRF,
        configEntries: [
          { name: 'min.insync.replicas', value: `${minIsr}` },
          { name: 'cleanup.policy', value: 'delete' },
          { name: 'retention.ms', value: '2592000000' }, // 30 days
        ],
      },
    ];

    console.log(`\nTopic Configuration:`);
    console.log(`  Replication Factor: ${argRF}`);
    console.log(`  Min ISR: ${minIsr}`);
    console.log(`\nCreating topics...`);

    for (const topicConfig of topicsConfig) {
      try {
        await admin.createTopics({
          topics: [topicConfig],
          validateOnly: false,
          waitForLeaders: true,
        });
        console.log(`✓ Created topic: ${topicConfig.topic}`);
        console.log(`  - Partitions: ${topicConfig.numPartitions}`);
        console.log(`  - Replication Factor: ${argRF}`);
        console.log(`  - Min ISR: ${minIsr}`);
        console.log(`  - Retention: ${topicConfig.configEntries.find(c => c.name === 'retention.ms').value}ms`);
      } catch (error) {
        if (error.type === 'TOPIC_ALREADY_EXISTS') {
          console.log(`⊘ Topic already exists: ${topicConfig.topic}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✓ Topic creation complete.');

    // List all topics
    console.log('\nListing all topics:');
    const metadata = await admin.fetchTopicMetadata();
    for (const topic of metadata.topics) {
      console.log(`  - ${topic.name} (${topic.partitions.length} partitions)`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await admin.disconnect();
  }
}

createTopics();
