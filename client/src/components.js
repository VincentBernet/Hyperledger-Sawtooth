'use strict';

const $ = require('jquery');

// Ajout d'une option de sélection qui peut être définie comme sélectionnée
const addOption = (parent, value, selected = false) => {
	const selectTag = selected ? ' selected' : '';
	$(parent).append(`<option value="${value}"${selectTag}>${value}</option>`);
};

// Ajout d'une nouvelle ligne au tableau avec n'importe quelle nombre de cellules
const addRow = (parent, ...cells) => {
	const tds = cells.map((cell) => `<td>${cell}</td>`).join('');
	$(parent).append(`<tr>${tds}</tr>`);
};

// Ajout d'une balise avec des boutons d'acceptations et/ou de rejet
const addAction = (parent, label, action) => {
	$(parent).append(`<div>
  <span>${label}</span>
  <input class="accept" type="button" value="Accept">
  <input class="reject" type="button" value="Reject">
</div>`);
};

module.exports = {
	addOption,
	addRow,
	addAction,
};
