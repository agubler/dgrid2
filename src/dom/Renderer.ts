import _Renderer from '../interfaces/Renderer';
import Dgrid, { Column } from '../Dgrid';
import on, { emit } from 'dojo-core/on';

class Renderer implements _Renderer {
	domNode: HTMLElement;

	viewForGrid(grid: Dgrid, header: HTMLElement, body: HTMLElement, view?: {domNode: HTMLElement}) {
		if (view) {
			return view;
		}
		this.domNode = document.createElement('div');
		const table = document.createElement('table');
		table.classList.add('dom');
		table.appendChild(header);
		table.appendChild(body);
		this.domNode.appendChild(table);
		return {
			domNode: this.domNode
		};
	}

	headerForGrid<T>(grid: Dgrid, columns: Column[], cells: { [key: string]: HTMLElement }, view?: {classesNode: HTMLElement, render: HTMLElement}) {
		if (!view) {
			const thead = document.createElement('thead');
			on(thead, 'click', () => {
				emit(grid, {
					type: 'thead:click'
				});
			});
			view = {
				classesNode: thead,
				render: thead
			};
		}

		const state = grid.state;
		if (state['theadFocused']) {
			view.classesNode.classList.add('thead-focused');
		}
		else {
			view.classesNode.classList.remove('thead-focused');
		}
		return view;
	}

	bodyForGrid(grid: Dgrid, view?: {classesNode: HTMLElement, render: HTMLElement}) {
		if (!view) {
			const tbody = document.createElement('tbody');
			on(tbody, 'click', () => {
				emit(grid, {
					type: 'tbody:click'
				});
			});
			view = {
				classesNode: tbody,
				render: tbody
			};
		}

		const state = grid.state;
		if (state['tbodyFocused']) {
			view.classesNode.classList.add('tbody-focused');
		}
		else {
			view.classesNode.classList.remove('tbody-focused');
		}
		return view;
	}
}

export default Renderer;
