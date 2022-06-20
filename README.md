# migrations
Mongoose Migration Framework

### Getting Started

```javascript
// Import the migration framework. Put this import **before** any other imports,
// except dotenv or other environment configuration
const migrations = require('@mongoosejs/migrations');

const Character = require('./models/character');
const mongoose = require('mongoose');

run().catch(err => { console.error(err); process.exit(-1); });

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');
  // Tell the migration framework that a migration is starting.
  // Set `restart` option if you want to restart a previously failed migration.
  await migrations.startMigration({ restart: process.env.RESTART });

  try {
    // Put any migration logic here - update, save, eachAsync, etc.
    await Character.updateMany({}, { $set: { ship: 'USS Enterprise' } });
  } finally {
    // Make sure to always call `endMigration()`, even if errors occur
    await migrations.endMigration();
    await mongoose.disconnect();
  }
}
```

### UI Setup

You can run the Migration Framework UI as an executable using the provided `migration-ui` command:

```
env PORT=3001 env MONGO_URI="mongodb://localhost:27017/mydb" ./node_modules/.bin/migration-ui
```

You can also import the Migration Framework UI to your Express app:

**Note:** you are responsible for securing the Migration Framework UI. There is currently no restrictions on the UI or API: anyone that can access the Migration Framework UI's URL can read migration data.
**Note:** do **not** run the Migration Framework UI in the same process that runs migrations.