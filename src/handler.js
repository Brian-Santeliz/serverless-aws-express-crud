const express = require('express');
const serverless = require('serverless-http');
const {v4} = require('uuid');
const AWS = require('aws-sdk');
const app = express();
const bcrypt = require('bcrypt');
const PRODUCTS_TABLE = process.env.TABLE_NAME;
	
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  })
  console.log(dynamoDb);
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};

app.use(express.json());

app.get('/hello', (req, res) => {
  res.status(200).json({
    msg: 'Hello from express!',
  });
});

app.post('/create-user', async (req, res) => {
  const { email, password } = req.body;
  if (!email.length || !password.length) {
    return res.status(400).json({ msg: 'All fields are required' });
  }
  const params = {
    TableName: PRODUCTS_TABLE,
    Item: {
      id: v4(),
      email,
      password: await bcrypt.hash(password, 10),
      createdAt: Date.now(),
    },
  };
  try {
    const result = await dynamoDb.put(params).promise();
    console.log(result);
    res.status(200).json({ msg: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ msg: 'Error creating user' });
  }
});

app.get('/users', async (req, res) => {
  const params = {
    TableName: PRODUCTS_TABLE,
  };
  try {
    const results = await dynamoDb.scan(params).promise();
    res.status(200).json({
      users: results.Items,
    });
  } catch (error) {
    res.status(400).json({ msg: 'Error retrieving users' });
  }
});

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const params = {
    TableName: PRODUCTS_TABLE,
    Key: {
      id,
    },
  };
  try {
    const { Item } = await dynamoDb.get(params).promise();
    res.status(200).json({
      user: Item,
    });
  } catch (error) {
    res.status(400).json({ msg: 'Error retrieving user' });
  }
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const params = {
    TableName: PRODUCTS_TABLE,
    Key: {
      id,
    },
  };
  try {
    const result = await dynamoDb.delete(params).promise();
    console.log(result);
    res.status(200).json({
      msg: 'User deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ msg: 'Error deleting user' });
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;
  if (!email.length || !password.length) {
    return res.status(400).json({ msg: 'All fields are required' });
  }
  const paramsUpdate  = {
    TableName:PRODUCTS_TABLE,
    Key:{
      id
    },
    UpdateExpression: 'SET email = :email, password = :password',
    ExpressionAttributeValues:{
      ':email':email,
      ':password': await bcrypt.hash(password, 10),
    }
  }
  try {
    const result = await dynamoDb.update(paramsUpdate).promise();
    console.log(result);
    res.status(200).json({
      msg: 'User updated successfully',
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({ msg: 'Error updating user' });
  }
});
//Handle Global Errors
app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});
module.exports.controller = serverless(app);
