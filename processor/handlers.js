'use strict';

const { createHash } = require('crypto');
const { TransactionHandler } = require('sawtooth-sdk/processor');
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions');
const { TransactionHeader } = require('sawtooth-sdk/protobuf');

// Encoding helpers and constants
const getAddress = (key, length = 64) => {
	return createHash('sha512').update(key).digest('hex').slice(0, length);
};

const FAMILY = 'transfer-chain';
const PREFIX = getAddress(FAMILY, 6);

const getAssetAddress = (name) => PREFIX + '00' + getAddress(name, 62);
const getTransferAddress = (asset) => PREFIX + '01' + getAddress(asset, 62);

const encode = (obj) =>
	Buffer.from(JSON.stringify(obj, Object.keys(obj).sort()));
const decode = (buf) => JSON.parse(buf.toString());

// Ajout d'un nouvelle actif à l'état
const createAsset = (asset, owner, state) => {
	const address = getAssetAddress(asset);

	return state.get([address]).then((entries) => {
		const entry = entries[address];
		if (entry && entry.length > 0) {
			throw new InvalidTransaction('Asset name in use');
		}

		return state.set({
			[address]: encode({ name: asset, owner }),
		});
	});
};

// Ajout d'un nouveau transfert à l'état
const transferAsset = (asset, owner, signer, state) => {
	const address = getTransferAddress(asset);
	const assetAddress = getAssetAddress(asset);

	return state.get([assetAddress]).then((entries) => {
		const entry = entries[assetAddress];
		if (!entry || entry.length === 0) {
			throw new InvalidTransaction('Asset does not exist');
		}

		if (signer !== decode(entry).owner) {
			throw new InvalidTransaction("Only an Asset's owner may transfer it");
		}

		return state.set({
			[address]: encode({ asset, owner }),
		});
	});
};

// Accept a transfer, clearing it and changing asset ownership
const acceptTransfer = (asset, signer, state) => {
	const address = getTransferAddress(asset);

	return state.get([address]).then((entries) => {
		const entry = entries[address];
		if (!entry || entry.length === 0) {
			throw new InvalidTransaction('Asset is not being transfered');
		}

		if (signer !== decode(entry).owner) {
			throw new InvalidTransaction(
				'Transfers can only be accepted by the new owner'
			);
		}

		return state.set({
			[address]: Buffer(0),
			[getAssetAddress(asset)]: encode({ name: asset, owner: signer }),
		});
	});
};

// Reject a transfer, clearing it
const rejectTransfer = (asset, signer, state) => {
	const address = getTransferAddress(asset);

	return state.get([address]).then((entries) => {
		const entry = entries[address];
		if (!entry || entry.length === 0) {
			throw new InvalidTransaction('Asset is not being transfered');
		}

		if (signer !== decode(entry).owner) {
			throw new InvalidTransaction(
				'Transfers can only be rejected by the potential new owner'
			);
		}

		return state.set({
			[address]: Buffer(0),
		});
	});
};

// Handler for JSON encoded payloads
class JSONHandler extends TransactionHandler {
	constructor() {
		console.log('Initializing JSON handler for Transfer-Chain');
		super(FAMILY, '0.0', 'application/json', [PREFIX]);
	}

	apply(txn, state) {
		// Parse the transaction header and payload
		const header = TransactionHeader.decode(txn.header);
		const signer = header.signerPubkey;
		const { action, asset, owner } = JSON.parse(txn.payload);

		// Call the appropriate function based on the payload's action
		console.log(
			`Handling transaction:  ${action} > ${asset}`,
			owner ? `> ${owner.slice(0, 8)}... ` : '',
			`:: ${signer.slice(0, 8)}...`
		);

		if (action === 'create') return createAsset(asset, signer, state);
		if (action === 'transfer')
			return transferAsset(asset, owner, signer, state);
		if (action === 'accept') return acceptTransfer(asset, signer, state);
		if (action === 'reject') return rejectTransfer(asset, signer, state);

		return Promise.resolve().then(() => {
			throw new InvalidTransaction(
				'Action must be "create", "transfer", "accept", or "reject"'
			);
		});
	}
}

module.exports = {
	JSONHandler,
};
