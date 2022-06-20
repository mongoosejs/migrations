'use strict';

const migrations = require('../../');
const mongoose = require('mongoose');

module.exports = function ui(conn, express) {
  conn = conn || mongoose.connection;

  migrations.initMigrationModels(conn);

  const { Migration, Operation } = migrations.models;

  const router = express.Router();

  router.get('/migrations', function(req, res) {
    Migration.
      find().
      sort({ createdAt: -1 }).
      then(migrations => res.json({ migrations })).
      catch(err => res.status(500).json({ message: err.message }));
  });

  router.get('/migration/:migrationId', function(req, res) {
    Migration.
      findById(req.params.migrationId).
      then(migration => ({ migration })).
      then(obj => {
        return Operation.
          find({ migrationId: req.params.migrationId }).
          sort({ createdAt: -1 }).
          then(operations => ({ ...obj, operations }));
      }).
      then(obj => res.json(obj)).
      catch(err => res.status(500).json({ message: err.message }));
  });

  router.use(express.static(`${__dirname}/public`));

  return router;
};