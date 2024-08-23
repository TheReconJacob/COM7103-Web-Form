const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 4000;

const supabaseUrl = 'https://wxjmxphdkmhgthgnizkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4am14cGhka21oZ3RoZ25pemt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI4MjgsImV4cCI6MjAzODE3ODgyOH0.23RLOOXWXYOKLNIv2ApUnx_VV7Af1Vp2y9WvtsOdhVs';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('Hello from RabbitMQ backend boy!');
});

app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
  })
);

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
    const { request, userId } = req.body;
    const { data: user, error } = await supabase
      .from('Users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !user) {
      console.error('Validation failed: User not found');
      return res.status(400).send('Validation failed: User not found');
    }

    await publishToRabbitMQ(request);
    res.status(200).send('Request published to RabbitMQ');
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}.`);
});