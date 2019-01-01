import { DataModelTable } from './dataModelTable';

export interface DataModelProject {

    [dmnTableId: string]: DataModelTable;
}
