'use strict';

const { TransactionProcessor } = require('sawtooth-sdk/processor');
const { JSONHandler } = require('./handlers');

const VALIDATOR_URL = 'tcp://localhost:4004';

// Initialisation du processus de transaction
const tp = new TransactionProcessor(VALIDATOR_URL);
tp.addHandler(new JSONHandler());
tp.start();
