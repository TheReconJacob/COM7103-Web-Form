const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 5000;

const supabaseUrl = 'https://servjwuxyghyunleemhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZqd3V4eWdoeXVubGVlbWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MTIxNzUsImV4cCI6MjAzOTk4ODE3NX0.wW8zEhpqKMhhgn5FIsEgCURJBUH83m5LVdp4brmhVHk';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(cors());

const rabbitmqUrl = 'amqp://rabbitmq:5672';

const processMessage = async (message) => {
  const messageContent = message.content.toString();

  try {
    if (!messageContent) {
      throw new Error('Invalid request data');
    }

    const request = messageContent;

    const { data: existingRequest, error: requestError, status } = await supabase
      .from('Requests')
      .select('*')
      .eq('request', request)
      .single();

    if (requestError && status !== 406) {
      throw new Error('Error fetching request');
    }

    if (existingRequest) {
      await supabase
        .from('Requests')
        .update({ status: 'processed' })
        .eq('id', existingRequest.id);
    } else {
      await supabase
        .from('Requests')
        .insert([{ request, status: 'processed' }]);
    }

    console.log('Request processed successfully');
  } catch (error) {
    console.error('Validation or processing error:', error.message);

    const { error: logError } = await supabase
      .from('ValidationLogs')
      .insert([{ request_id: null, error_message: error.message }]);

    if (logError) {
      console.error('Error logging validation:', logError);
    }
  }
};  

const consumeMessages = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    const queueName = 'messageQueue';

    await channel.assertQueue(queueName);

    channel.consume(queueName, (message) => {
      if (message) {
        processMessage(message);
        channel.ack(message);
      }
    });

    console.log('Waiting for messages...');
  } catch (error) {
    console.error('Error consuming messages:', error);
  }
};

consumeMessages();

app.listen(port, () => {
  console.log(`Validation microservice running on port ${port}`);
});