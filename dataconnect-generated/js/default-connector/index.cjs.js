const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'HelloWorld184',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

