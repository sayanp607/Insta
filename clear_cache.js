const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateMany({}, { $unset: { profile_embedding_v2: 1, search_embedding: 1 } });
  console.log('Cleared cache for users:', result.modifiedCount);
  process.exit(0);
});
