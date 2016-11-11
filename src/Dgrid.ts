import Scaffolding from './Scaffolding';
import Customize from './interfaces/Customize';
import Renderer from './interfaces/Renderer';
import View from './interfaces/View';
import on from 'dojo-core/on';
import Evented from 'dojo-core/Evented';
import has, { add as addHas } from 'dojo-has/has';
import { CrudOptions, Store } from 'dojo-stores/store/createStore';
import { ObservableStoreMixin } from 'dojo-stores/store/mixins/createObservableStoreMixin';
import { createSort } from 'dojo-stores/query/Sort';
import { QueryMixin} from 'dojo-stores/store/mixins/createQueryMixin';
import { UpdateResults } from 'dojo-stores/storage/createInMemoryStorage';
import { Subscription } from 'rxjs/Rx';

export interface Column {
	id: string;
	label: string;
	field?: string;
	sortable?: boolean;
}

export interface Sort {
	property: string;
	descending: boolean;
}

export interface SortTarget extends HTMLElement {
	sortable: boolean;
	field: string;
	columnId: string;
}

export interface SortEvent {
	type: string;
	grid: Dgrid;
	event: (MouseEvent | KeyboardEvent);
	target: SortTarget;
}

export interface DgridProperties {
	columns: Column[];
	collection?: any[];
	idProperty?: string;
	store?: Store<any, CrudOptions, UpdateResults<any>>;
}

type ObservableStore = Store<any, CrudOptions, UpdateResults<any>> & ObservableStoreMixin<any>;

let scrollbarWidth = 0;

function cleanupTestElement(element: HTMLElement) {
	element.className = '';
	if (element.parentNode) {
		document.body.removeChild(element);
	}
}

function getScrollbarSize(element: HTMLElement, dimension: string) {
	// Used by has tests for scrollbar width/height
	element.className = 'dgrid-scrollbar-measure';
	document.body.appendChild(element);
	const offset: number = (<any> element)['offset' + dimension];
	const client: number = (<any> element)['client' + dimension];
	let size: number = (offset - client);
	cleanupTestElement(element);
	if (false && has('ie')) {
		// Avoid issues with certain widgets inside in IE7, and
		// ColumnSet scroll issues with all supported IE versions
		size++;
	}
	return size;
}
addHas('dom-scrollbar-width', function () {
	return getScrollbarSize(document.createElement('div'), 'Width');
});
addHas('dom-scrollbar-height', function () {
	return getScrollbarSize(document.createElement('div'), 'Height');
});

class Dgrid extends Evented implements Renderer {
	// TODO: this seems like a legitimate use of any, but should/can this be generic?
	_store: Store<any, CrudOptions, UpdateResults<any>>;
	_storeSubscription: Subscription;

	idProperty: string = 'id';
	state: {[key: string]: any};
	props: DgridProperties;
	domNode: HTMLElement;
	renderer: Renderer;
	customize: Customize;
	scaffolding: Scaffolding<any>;
	sort: Sort[];

	get store(): any {
		return this._store;
	}

	set store(newStore: any) {
		if (this._store === newStore) {
			return;
		}

		if (this._storeSubscription) {
			this._storeSubscription.unsubscribe();
			this._storeSubscription = null;
		}

		this._store = newStore;

		this._updateCollectionFromStore();

		if ((<ObservableStore> this._store).observe) {
			this._storeSubscription = (<ObservableStore> this._store).observe().subscribe(() => {
				this._updateCollectionFromStore();
			});
		}
	}

	_updateCollectionFromStore() {
		this._store.fetch().then((data: any[]) => {
			this.props.collection = data;
			this.scaffolding.reloadAt(this, 'bodyForGrid');
		});
	}

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

		// TODO: we need a unified approach on constructor params
		if (props.idProperty) {
			this.idProperty = props.idProperty;
		}

		if (props.store) {
			this.store = props.store;
		}

		const scaffolding = this.scaffolding = new Scaffolding({
			idProperty: this.idProperty
		});

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
			},
			identify: (item: any) => {
				return this._store.identify(item)[0];
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
		if (!scrollbarWidth) {
			// Measure the browser's scrollbar width using a DIV we'll delete right away
			scrollbarWidth = <number> has('dom-scrollbar-width');
		}
		return this.renderer.headerForGrid(grid, content, scrollbarWidth, view);
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

		on(this, 'dgrid-sort', (event: SortEvent) => {
			const target = event.target;
			const field = (target.field || target.columnId);
			const sort = (this.sort && this.sort[0]);
			let newSort: Sort[] = [{
				property: field,
				descending: (sort && sort.property === field && !sort.descending)
			}];
			this.sort = newSort;
			if (newSort.length) {
				const sortable = <QueryMixin<any, CrudOptions, UpdateResults<any>, Store<any, CrudOptions, UpdateResults<any>>>> this.store;
				this.store = sortable.sort(newSort[0].property, newSort[0].descending);
			}
		});
	}
}

export default Dgrid;
