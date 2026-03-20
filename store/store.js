const Store = require('electron-store');

const schema = {
  windowPosition: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    },
  },
  placedItems: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id:       { type: 'string' },
        assetKey: { type: 'string' },
        x:        { type: 'number' },
        y:        { type: 'number' },
      },
      required: ['id', 'assetKey', 'x', 'y'],
    },
  },
  inventoryItems: {
    type: 'array',
    default: ['hat', 'book', 'flower', 'coffee', 'gem'],
  },
};

module.exports = new Store({ schema });
