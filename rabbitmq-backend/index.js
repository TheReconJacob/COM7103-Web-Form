const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const fetch = require('node-fetch');
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

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Unauthorized: No token provided');
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const response = await fetch(`${supabaseUrl1}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey1
      }
    });
    const data = await response.json();
    console.log('Supabase response:', response.status, data);

    if (!response.ok || !data || !data.id) {
      console.error('Validation failed: User not authenticated');
      return res.status(401).send('Unauthorized: Invalid token');
    }
    
    req.user = data;
    next();
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).send('Internal Server Error');
  }
};

app.post('/publish-request', authenticateToken, async (req, res) => {
  try {
    const { request } = req.body;
    const userId = req.user.id;

    // Insert request into the first database
    const { data: syncData1, error: syncError1 } = await supabase1
      .from('Requests')
      .insert([{ request, status: 'pending', user_id: userId }]);

    if (syncError1) {
      console.error('Error syncing request to first database:', syncError1);
      return res.status(500).send('Error syncing request to first database');
    }

    // Insert request into the second database
    const { data: syncData2, error: syncError2 } = await supabase2
      .from('Requests')
      .insert([{ request, status: 'pending' }]);

    if (syncError2) {
      console.error('Error syncing request to second database:', syncError2);
      return res.status(500).send('Error syncing request to second database');
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