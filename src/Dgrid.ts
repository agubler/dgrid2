import Scaffolding from './Scaffolding';
import Customize from './interfaces/Customize';
import Renderer from './interfaces/Renderer';
import View from './interfaces/View';
import on from 'dojo-core/on';
import Evented from 'dojo-core/Evented';

export interface Column {
	id: string;
	label: string;
	field?: string;
}

export interface DgridProperties {
	columns: Column[];
	collection: any[];
}

class Dgrid extends Evented implements Renderer {
	state: {[key: string]: any};
	props: DgridProperties;
	domNode: HTMLElement;
	renderer: Renderer;
	customize: Customize;
	scaffolding: Scaffolding<any>;

	reloadData(at?: { row?: number, column?: string }) {
		let column: Column;
		if (!at) {
			this.scaffolding.reloadPath(this, 'bodyForGrid');
		}
		else {
			if ('column' in at) {
				for (let possible of this.props.columns) {
					if (possible.id === at.column) {
						column = possible;
						break;
					}
				}
			}
			if ('row' in at && 'column' in at) {
				this.scaffolding.reloadPath(this, 'rowForGrid', [this.props.collection[at.row], column]);
			}
			else if ('row' in at) {
				this.scaffolding.reloadPath(this, 'rowForGrid', [this.props.collection[at.row]]);
			}
			else if ('column' in at) {
				// should this be done?
			}
		}
	}

	registerView (view: View<any>, identifier: string) {
		this.scaffolding.registerView(view, identifier);
	}

	viewWithIdentifier (identifier: string): any {
		return this.scaffolding.viewWithIdentifier(identifier);
	}

	constructor (domNode: HTMLElement, props: DgridProperties) {
		super();

		this.props = props;
		this.domNode = domNode;
		this.state = {};
		const scaffolding = this.scaffolding = new Scaffolding();

		scaffolding.shouldReloadParent = this.shouldReloadParent.bind(this);
		scaffolding.add({
			id: 'viewForGrid',
			context: this,
			callback: this.viewForGrid
		});
		scaffolding.add(({
			id: 'headerForGrid',
			context: this,
			callback: this.headerForGrid,
			parent: 'viewForGrid'
		}));
		scaffolding.add({
			id: 'headerViewForGrid',
			context: this,
			callback: this.headerViewForGrid,
			parent: 'headerForGrid',
			groupChildren: true
		});
		scaffolding.add({
			id: 'headerCellForGrid',
			context: this,
			callback: this.headerCellForGrid,
			parent: 'headerViewForGrid',
			over: () => {
				return this.props.columns;
			}
		});
		scaffolding.add({
			id: 'headerCellViewForGrid',
			context: this,
			callback: this.headerCellViewForGrid,
			parent: 'headerCellForGrid'
		});
		scaffolding.add({
			id: 'bodyForGrid',
			context: this,
			callback: this.bodyForGrid,
			parent: 'viewForGrid',
			groupChildren: true
		});
		scaffolding.add({
			id: 'rowForGrid',
			context: this,
			callback: this.rowForGrid,
			parent: 'bodyForGrid',
			over: () => {
				return this.props.collection;
			}
		});
		scaffolding.add({
			id: 'rowViewForGrid',
			context: this,
			callback: this.rowViewForGrid,
			parent: 'rowForGrid',
			groupChildren: true
		});
		scaffolding.add({
			id: 'cellForGrid',
			context: this,
			callback: this.cellForGrid,
			parent: 'rowViewForGrid',
			over: () => {
				return this.props.columns;
			}
		});
		scaffolding.add({
			id: 'cellViewForGrid',
			context: this,
			callback: this.cellViewForGrid,
			parent: 'cellForGrid'
		});
	}

	shouldReloadParent(oldRender: any, newRender: any) {
		return this.renderer.shouldReloadParent(oldRender, newRender);
	}

	viewForGrid(grid: Dgrid, header: any, body: any, view?: any) {
		return this.renderer.viewForGrid(grid, header, body, view);
	}

	headerForGrid(grid: Dgrid, content: any, view?: any) {
		return this.renderer.headerForGrid(grid, content, view);
	}

	headerViewForGrid(grid: Dgrid, children: any[], view?: any) {
		const cells: { [key: string]: any } = {},
			columns = this.props.columns;
		for (let i = 0, il = columns.length; i < il; i++) {
			cells[columns[i].id] = children[i];
		}
		if (this.customize && this.customize.headerViewForGrid) {
			return this.customize.headerViewForGrid(grid, columns, cells, view);
		}
		return this.renderer.headerViewForGrid(grid, columns, cells, view);
	}

	headerCellForGrid(grid: Dgrid, column: Column, content: any, view?: any) {
		return this.renderer.headerCellForGrid(grid, column, content, view);
	}

	headerCellViewForGrid(grid: Dgrid, column: Column, view?: any) {
		if (this.customize && this.customize.headerCellViewForGrid) {
			return this.customize.headerCellViewForGrid(grid, column, view);
		}
		return this.renderer.headerCellViewForGrid(grid, column, view);
	}

	bodyForGrid(grid: Dgrid, rows: any[], view?: any) {
		return this.renderer.bodyForGrid(grid, rows, view);
	}

	rowForGrid(grid: Dgrid, data: any, content: any, view?: any) {
		return this.renderer.rowForGrid(grid, data, content, view);
	}

	rowViewForGrid(grid: Dgrid, data: any, children: any[], view?: any) {
		const cells: { [key: string]: any } = {},
			columns = this.props.columns;
		for (let i = 0, il = columns.length; i < il; i++) {
			cells[columns[i].id] = children[i];
		}
		if (this.customize && this.customize.rowViewForGrid) {
			return this.customize.rowViewForGrid(grid, data, columns, cells, view);
		}
		return this.renderer.rowViewForGrid(grid, data, columns, cells, view);
	}

	cellForGrid(grid: Dgrid, data: any, column: Column, content: any, view?: any) {
		return this.renderer.cellForGrid(grid, data, column, content, view);
	}

	cellViewForGrid(grid: Dgrid, data: any, column: Column, view?: any) {
		if (this.customize && this.customize.cellViewForGrid) {
			return this.customize.cellViewForGrid(grid, data, column, view);
		}
		return this.renderer.cellViewForGrid(grid, data, column, view);
	}

	startup () {
		const scaffolding = this.scaffolding;
		const view = scaffolding.build(this);
		let domNode = this.domNode;
		if (domNode.parentNode) {
			domNode.parentNode.replaceChild(view.domNode, domNode);
			domNode = view.domNode;
			this.domNode = domNode;
		}
		else {
			domNode.appendChild(view.domNode);
		}
		const state = this.state;

		on(this, 'thead:click', (event: MouseEvent) => {
			state['theadFocused'] = !state['theadFocused'];
			console.log('thead focused:', state['theadFocused']);
			scaffolding.reloadAt(this, 'headerViewForGrid');
		});
		on(this, 'tbody:click', (event: MouseEvent) => {
			state['tbodyFocused'] = !state['tbodyFocused'];
			console.log('tbody focused:', state['tbodyFocused']);
			scaffolding.reloadAt(this, 'bodyForGrid');
		});
	}
}

export default Dgrid;
