const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');

const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('Hello from RabbitMQ backend boy!');
});

app.use(express.json());

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
}));

const rabbitmqUrl = 'amqp://rabbitmq:5672';

const publishToRabbitMQ = async (message) => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    const queueName = 'messageQueue';

    await channel.assertQueue(queueName);
    await channel.sendToQueue(queueName, Buffer.from(message));

    console.log(`Message published to RabbitMQ: ${message}`);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error publishing to RabbitMQ:', error);
  }
};

app.post('/publish-request', async (req, res) => {
  try {
    const { request } = req.body;

    publishToRabbitMQ(request);

    res.status(200).send('Request published to RabbitMQ');
  } catch (error) {
    console.error('Error publishing request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}.`);
});