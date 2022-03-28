'use strict';

const assert = require('assert');
const { describe, it, afterEach } = require('mocha');
const migrations = require('../');

describe('index', function() {
  afterEach(() => migrations.endMigration().catch(() => {}));

  it('throws if running migration that already ran', async function() {
    await migrations.startMigration({ name: 'v1.1.0/set-user-info' });
    await migrations.endMigration();

    const err = await migrations.startMigration({ name: 'v1.1.0/set-user-info' }).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, 'Migration "v1.1.0/set-user-info" already ran');
  });
});