'use strict';

module.exports = eachAsync;

async function eachAsync(model, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = null;
  }

  const totalCount = await model.countDocuments();

  const opFilter = migration.lastOperationId ? { _id: { $gt: migration.lastOperationId } } : {};
  Object.assign(opFilter, {
    migrationId: migration._id,
    modelName: model.modelName,
    opName: 'eachAsync',
    userFunctionName: options?.name || fn.name,
  });
  const op = await Operation.findOneAndUpdate(
    opFilter,
    {
      $setOnInsert: {
        parameters: {
          options
        },
        state: {
          current: 0,
          totalCount
        }
      }
    },
    { new: true, upsert: true }
  );

  migration.lastOperationId = op._id;
  await migration.save();

  const cursorFilter = op.lastSeenSortKey != null ? { _id: { $gte: op.lastSeenSortKey } } : {};
  const cursor = model.find(cursorFilter).sort({ _id: 1 }).cursor();

  for await (const doc of cursor) {
    if (op.firstSeenSortKey == null) {
      op.firstSeenSortKey = doc._id;
    }
    op.lastSeenSortKey = doc._id;
    ++op.state.current;
    op.markModified('state.current');
    await op.save();

    try {
      await fn(doc);
    } catch (err) {
      op.status = 'error';
      op.error.message = err.message;
      op.error.stack = err.stack;
      op.endedAt = new Date();
      --op.state.current;
      op.markModified('state.current');
      await op.save();

      migration.status = 'error';
      migration.endedAt = new Date();
      await migration.save();

      throw err;
    }
  }

  op.status = 'complete';
  op.endedAt = new Date();
  await op.save();
}