import { BaseEvent } from './event';
import { EventType } from './eventType';

export class RenameArtefactEvent extends BaseEvent<{ artefactId: string, newArtefactId: string }> {
    public constructor(artefactId: string, newArtefactId: string) {
        super(EventType.RENAME_ARTEFACT, {newArtefactId: newArtefactId, artefactId: artefactId});
    }
}
