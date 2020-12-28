import { globalComponentsRegistrator } from '../ComponentsRegistrator.js';
import * as common from './common';
import * as items from './items';
import * as list from './list';
import * as mixins from './mixins';
import * as page from './page';
import * as widgets from './widgets';
import AddChildModal from './list/AddChildModal.vue';
import EmptyComponent from './EmptyComponent.js';

globalComponentsRegistrator.add(AddChildModal);

export { EmptyComponent, common, items, list, mixins, page, widgets };
