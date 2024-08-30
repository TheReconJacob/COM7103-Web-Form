const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 4000;

const supabaseUrl1 = 'https://wxjmxphdkmhgthgnizkv.supabase.co';
const supabaseKey1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4am14cGhka21oZ3RoZ25pemt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI4MjgsImV4cCI6MjAzODE3ODgyOH0.23RLOOXWXYOKLNIv2ApUnx_VV7Af1Vp2y9WvtsOdhVs';
const supabase1 = createClient(supabaseUrl1, supabaseKey1);

const supabaseUrl2 = 'https://servjwuxyghyunleemhk.supabase.co';
const supabaseKey2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZqd3V4eWdoeXVubGVlbWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MTIxNzUsImV4cCI6MjAzOTk4ODE3NX0.wW8zEhpqKMhhgn5FIsEgCURJBUH83m5LVdp4brmhVHk';
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

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

    const { data: user, error: userError } = await supabase1
      .from('Users')
      .select('*')
      .eq('id', userId)
      .single();
    if (userError || !user) {
      console.error('Validation failed: User not found');
      return res.status(400).send('Validation failed: User not found');
    }

    const { data: syncData, error: syncError } = await supabase2
      .from('Requests')
      .insert([{ request, status: 'pending' }]);

    if (syncError) {
      console.error('Error syncing request to second database:', syncError);
      return res.status(500).send('Error syncing request');
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