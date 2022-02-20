'use strict';

const $ = require('jquery');
const {
	getKeys,
	makeKeyPair,
	saveKeys,
	getState,
	submitUpdate,
} = require('./state');
const { addOption, addRow, addAction } = require('./components');

const concatNewOwners = (existing, ownerContainers) => {
	return existing.concat(
		ownerContainers
			.filter(({ owner }) => !existing.includes(owner))
			.map(({ owner }) => owner)
	);
};

// Application Object
const app = { user: null, keys: [], assets: [], transfers: [] };

app.refresh = function () {
	getState(({ assets, transfers }) => {
		this.assets = assets;
		this.transfers = transfers;

		// Efface les vues de données existantes
		$('#assetList').empty();
		$('#transferList').empty();
		$('[name="assetSelect"]').children().slice(1).remove();
		$('[name="transferSelect"]').children().slice(1).remove();

		// Génère les vues d'actifs
		assets.forEach((asset) => {
			addRow('#assetList', asset.name, asset.owner);
			if (this.user && asset.owner === this.user.public) {
				addOption('[name="assetSelect"]', asset.name);
			}
		});

		// Remplis la liste de transfert pour l'utilisateur sélectionné
		transfers
			.filter((transfer) => transfer.owner === this.user.public)
			.forEach((transfer) =>
				addAction('#transferList', transfer.asset, 'Accept')
			);

		// Remplis la sélection de transfert avec les clés locales et celles de la blockchain.
		let publicKeys = this.keys.map((pair) => pair.public);
		publicKeys = concatNewOwners(publicKeys, assets);
		publicKeys = concatNewOwners(publicKeys, transfers);
		publicKeys.forEach((key) => addOption('[name="transferSelect"]', key));
	});
};

app.update = function (action, asset, owner) {
	if (this.user) {
		submitUpdate({ action, asset, owner }, this.user.private, (success) =>
			success ? this.refresh() : null
		);
	}
};

// Selection de l'utilisateur
$('[name="keySelect"]').on('change', function () {
	if (this.value === 'new') {
		app.user = makeKeyPair();
		app.keys.push(app.user);
		saveKeys(app.keys);
		addOption(this, app.user.public, true);
		addOption('[name="transferSelect"]', app.user.public);
	} else if (this.value === 'none') {
		app.user = null;
	} else {
		app.user = app.keys.find((key) => key.public === this.value);
		app.refresh();
	}
});

// Création d'une Asset
$('#createSubmit').on('click', function () {
	const asset = $('#createName').val();
	if (asset) app.update('create', asset);
});

// Transfert d'une Asset
$('#transferSubmit').on('click', function () {
	const asset = $('[name="assetSelect"]').val();
	const owner = $('[name="transferSelect"]').val();
	if (asset && owner) app.update('transfer', asset, owner);
});

// Acceptation d'une Asset
$('#transferList').on('click', '.accept', function () {
	const asset = $(this).prev().text();
	if (asset) app.update('accept', asset);
});

$('#transferList').on('click', '.reject', function () {
	const asset = $(this).prev().prev().text();
	if (asset) app.update('reject', asset);
});

// Initialisation
app.keys = getKeys();
app.keys.forEach((pair) => addOption('[name="keySelect"]', pair.public));
app.refresh();
