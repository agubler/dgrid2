import _Renderer from '../interfaces/Renderer';
import { createProjector, Projector, h, VNode } from 'maquette';
import Dgrid, { Column } from '../Dgrid';
import { emit } from 'dojo-core/on';

let viewForGridChildren: {
	header: VNode,
	body: VNode,
	renderMaquette: () => VNode
} = {
	header: null,
	body: null,
	renderMaquette: function() {
		return h('table.maquette', [this.header, this.body]);
	}
};

let emitTbodyClick: (event: MouseEvent) => void;
let emitTheadClick: (event: MouseEvent) => void;

class Renderer implements _Renderer {
	projector: Projector;
	domNode: HTMLElement;

	viewForGrid(grid: Dgrid, header: VNode, body: VNode, view?: {domNode: HTMLElement}) {
		viewForGridChildren.header = header;
		viewForGridChildren.body = body;
		if (view) {
			this.projector.scheduleRender();
			return view;
		}
		if (!this.domNode) {
			this.domNode = document.createElement('div');
		}
		if (!this.projector) {
			this.projector = createProjector({});
		}
		this.projector.append(this.domNode, function() {
			return viewForGridChildren.renderMaquette();
		});
		return {
			domNode: this.domNode
		};
	}

	headerCellForGrid?<T>(grid: Dgrid, column: Column, view?: { render: string }) {
		return {
			render: column.label
		};
	}

	headerForGrid<T>(grid: Dgrid, columns: Column[], cells: { [key: string]: VNode }, view?: {render: VNode}) {
		const state = grid.state;

		if (!emitTheadClick) {
			emitTheadClick = function () {
				emit(grid, {
					type: 'thead:click'
				});
			};
		}

		const children: VNode[] = [];
		for (let column of columns) {
			children.push(h('th.dgrid-column-' + column.id, [ cells[column.id] ]));
		}

		return {
			render: h('thead', {
				onclick: emitTheadClick,
				classes: {
					'thead-focused': state['theadFocused']
				}
			}, [ h('tr', children) ])
		};
	}

	bodyForGrid(grid: Dgrid, view?: {render: VNode}) {
		const state = grid.state;

		if (!emitTbodyClick) {
			emitTbodyClick = function () {
				emit(grid, {
					type: 'tbody:click'
				});
			};
		}

		return {
			render: h('tbody', {
				onclick: emitTbodyClick,
				classes: {
					'tbody-focused': state['tbodyFocused']
				}
			})
		};
	}
}

export default Renderer;
