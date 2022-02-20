'use strict';

const $ = require('jquery');
const {
	signer,
	BatchEncoder,
	TransactionEncoder,
} = require('sawtooth-sdk/client');

// Configurations des variables
const KEY_NAME = 'transfer-chain.keys';
const API_URL = 'http://localhost:8008';

const FAMILY = 'transfer-chain';
const VERSION = '0.0';
const PREFIX = '19d832';

// Récupération des paires de clés depuis le localStorage
const getKeys = () => {
	const storedKeys = localStorage.getItem(KEY_NAME);
	if (!storedKeys) return [];

	return storedKeys.split(';').map((pair) => {
		const separated = pair.split(',');
		return {
			public: separated[0],
			private: separated[1],
		};
	});
};

// Création d'une nouvelle paire de clés
const makeKeyPair = () => {
	const privateKey = signer.makePrivateKey();
	return {
		public: signer.getPublicKey(privateKey),
		private: privateKey,
	};
};

// Sauvegarde des pairs de clés dans le localStorage
const saveKeys = (keys) => {
	const paired = keys.map((pair) => [pair.public, pair.private].join(','));
	localStorage.setItem(KEY_NAME, paired.join(';'));
};

// Récupération de l'état actuel de la chaîne de transfert à partir du validateur
const getState = (cb) => {
	$.get(`${API_URL}/state?address=${PREFIX}`, ({ data }) => {
		cb(
			data.reduce(
				(processed, datum) => {
					if (datum.data !== '') {
						const parsed = JSON.parse(atob(datum.data));
						if (datum.address[7] === '0') processed.assets.push(parsed);
						if (datum.address[7] === '1')
							processed.transfers.push(parsed);
					}
					return processed;
				},
				{ assets: [], transfers: [] }
			)
		);
	});
};

// Soumission de la transition signée au validateur
const submitUpdate = (payload, privateKey, cb) => {
	const transaction = new TransactionEncoder(privateKey, {
		inputs: [PREFIX],
		outputs: [PREFIX],
		familyName: FAMILY,
		familyVersion: VERSION,
		payloadEncoding: 'application/json',
		payloadEncoder: (p) => Buffer.from(JSON.stringify(p)),
	}).create(payload);

	const batchBytes = new BatchEncoder(privateKey).createEncoded(transaction);

	$.post({
		url: `${API_URL}/batches?wait`,
		data: batchBytes,
		headers: { 'Content-Type': 'application/octet-stream' },
		processData: false,
		// Tout données indiquant que le lot n'a pas été validé.
		success: ({ data }) => cb(!data),
		error: () => cb(false),
	});
};

module.exports = {
	getKeys,
	makeKeyPair,
	saveKeys,
	getState,
	submitUpdate,
};
