const { Kafka } = require('kafkajs');

const judger = require('./judger')
const resultProducer = require('./result-producer');

const {
  KAFKA_BOOTSTRAP_SERVER,
  SUBMIT_CLIENT_ID,
  SUBMIT_GROUP_ID,
  SUBMIT_TOPIC,
} = require('./env');

const kafka = new Kafka({
  brokers: [KAFKA_BOOTSTRAP_SERVER],
  clientId: SUBMIT_CLIENT_ID,
});

const init = async () => {
  const consumer = kafka.consumer({ groupId: SUBMIT_GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: SUBMIT_TOPIC });
  consumer.run({
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ topic, partition, message }) => {
      const submitId = message;

      const result = await judger.startJudge(submitId);

      resultProducer.sendMessage(submitId);
    },
  });

  return consumer;
};

module.exports = {
  init
};
