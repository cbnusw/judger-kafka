const { Kafka } = require("kafkajs");

const judger = require("./judger")
const resultProducer = require("./result-producer");

const {
  KAFKA_BOOTSTRAP_SERVER,
  SUMBIT_CLINET_ID,
  SUMBIT_GROUP_ID,
  SUMBIT_TOPIC,
} = require("./env");

const kafka = new Kafka({
  brokers: [KAFKA_BOOTSTRAP_SERVER],
  clientId: SUMBIT_CLINET_ID,
});

const init = async () => {
  const consumer = kafka.consumer({ groupId: SUMBIT_GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: SUMBIT_TOPIC });
  consumer.run({
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ topic, partition, message }) => {
      const sumbitId = message;

      const result = await judger.startJudge(sumbitId);

      resultProducer.sendMessage(sumbitId);
    },
  });

  return consumer;
};

module.exports = {
  init
};